function getTextContent( elementID ) {
    var element = document.getElementById(elementID);
    var node = element.firstChild;
    var str = "";
    while (node) {
        if (node.nodeType == 3) // this is a text node
            str += node.textContent;
        node = node.nextSibling;
    }
    return str;
}

function main() {
  const vsSource = getTextContent("vshader");
  const fsSource = getTextContent("fshader");
  const canvas = document.querySelector("#glCanvas");
  const gl = canvas.getContext("webgl");

  if (gl == null) {
    alert("unable to initializa webgl.")
    return;
  }

  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'vertexPos')
    },
    uniformLocation: {
      M: gl.getUniformLocation(shaderProgram, 'uM'),
      V: gl.getUniformLocation(shaderProgram, 'uV'),
      P: gl.getUniformLocation(shaderProgram, 'uP')
    }
  };

  const vertsBuffer = initBuffers(gl);
  drawScene(gl, programInfo, vertsBuffer);
}

// initializa shaders

function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource)
  const frgmntShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource)
  console.log(frgmntShader);
  const shaderProgram = gl.createProgram();

  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, frgmntShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }
  return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initBuffers(gl) {
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // const positions = [
  //   -1.0, 0.0, -5.0,
  //   1.0, 0.0, -5.0,
  //   0.0, 1.0, -5.0,
  // ];
  const positions = [
   1.0,  1.0, -0,
  -1.0,  1.0, -0,
   1.0, -1.0, -0,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  return {position: positionBuffer};
}

function getViewMatrix(eye_pos, look_at_pt) {
  viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, eye_pos, look_at_pt, [0.0, 1.0, 0.0]);
  return viewMatrix;
}

function getProjMatrix(width, height) {
  projMatrix = mat4.create();
  mat4.perspective(projMatrix, 45 * Math.PI / 180, width / height, 0.1, 100);
  return projMatrix;
}

function drawScene(gl, programInfo, buffer) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  projMatrix = getProjMatrix(gl.canvas.clientWidth, gl.canvas.clientHeight);


  // projMatrix = mat4.ortho(projMatrix, -2, 2, -2, 2, 0.1, 100);
  // viewMatrix = getViewMatrix([5, 0, 0], [0, 0, 0]);
  viewMatrix = mat4.create();
  mat4.translate(viewMatrix, viewMatrix, [0, 0, -5]);
  // console.log(viewMatrix);
  modlMatrix = mat4.create();

  {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  }
  gl.useProgram(programInfo.program);
  gl.uniformMatrix4fv(programInfo.uniformLocation.P, false, projMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocation.V, false, viewMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocation.M, false, modlMatrix);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

window.onload = main;
