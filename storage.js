const vsSource = `
attribute vec3 vertexPos;
attribute vec3 vertexNorm;

varying vec3 normColor;
varying vec4 position_2_light;
varying vec2 tex_coord;

uniform mat4 uM;
uniform mat4 uV;
uniform mat4 uP;
uniform mat4 uV_light;
uniform mat4 uP_light;

uniform vec3 lightPos;

void main() {
  vec3 vToLight = normalize(lightPos - vertexPos);
  float lightAmt = max(dot(vToLight, vertexNorm), 0.0);
  gl_Position = uP * uV * uM * vec4(vertexPos, 1.0);
  // gl_Position = uP_light * uV_light * vec4(vertexPos, 1.0);

  normColor = vec3(lightAmt, lightAmt, lightAmt) + vec3(0.2, 0.2, 0.2);
  position_2_light = uP_light * uV_light * uM * vec4(vertexPos, 1.0) ;
  tex_coord = vertexPos.xy * 0.5 + 0.5;
}
`

const light_vs = `
attribute vec3 vertexPos;

uniform mat4 uM;
uniform mat4 uV;
uniform mat4 uP;

void main() {
  gl_Position = uP * uV * uM * vec4(vertexPos, 1.0);
  // gl_Position.z = -float(1);
}
`

const empty_fs =  `
void main (){
  gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
}
`

const fsSource = `
  precision mediump float;

  varying vec3 normColor;
  varying vec4 position_2_light;
  varying vec2 tex_coord;

  uniform sampler2D depthMap;

  void main() {
    vec3 lightProjCoords = position_2_light.xyz / position_2_light.w;
    lightProjCoords = lightProjCoords * 0.5 + 0.5;
    float shadow_amt = 0.0;

    if (lightProjCoords.z > 1.0) {
      shadow_amt = 0.0;
    }
    // else if (lightProjCoords.z - 0.00004>= texture2D(depthMap, lightProjCoords.xy).x) {
    //   shadow_amt = 0.5;
    // } else {
    //   shadow_amt = 0.0;
    // }

    // with pcf ( blur?)
    else {
      for (float x = -1.0; x <= 1.0; x++) {
        for (float y = -1.0; y <= 1.0; y++) {
          float pcfDepth = texture2D(depthMap, lightProjCoords.xy + vec2(x / 1024.0, y / 1024.0)).x;
          if (lightProjCoords.z - 0.0004 >= pcfDepth) {
            shadow_amt += 0.5;
          }
        }
      }
      shadow_amt /= 9.0;
    }
    gl_FragColor = vec4( (1.0 - shadow_amt )* normColor, 1.0);
  }`
