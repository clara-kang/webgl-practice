lightLocation = [-5, 5, 1];

function parseObj(obj_str) {
  const model = {
    vs: [],
    vns: [],
    fs: [],
    fns: []
  };

  let get_next_idx = function(start_idx) {
    return obj_str.indexOf("\n", start_idx);
  }

  let parseLine = function(line) {
    if (line.startsWith("vn")) {
      let segs = line.split(" ");
      model.vns.push([parseFloat(segs[1]), parseFloat(segs[2]), parseFloat(segs[3])]);
      // model.vns.push(parseFloat(segs[1]), parseFloat(segs[2]), parseFloat(segs[3]));
    }
    else if (line.startsWith("v")) {
      let segs = line.split(" ");
      model.vs.push([parseFloat(segs[1]), parseFloat(segs[2]), parseFloat(segs[3])]);
      // model.vs.push(parseFloat(segs[1]), parseFloat(segs[2]), parseFloat(segs[3]));
    }
    else if (line.startsWith("f")) {
      let segs = line.split(" ");
      for (let i = 1; i < 4; i++) {
        fsegs = segs[i].split("/");
        // face.push(parseInt(fsegs[0]));
        // face.push([parseInt(fsegs[0]), parseInt(fsegs[1]), parseInt(fsegs[2])]);
        model.fs.push(parseInt(fsegs[0])-1);
        model.fns.push(parseInt(fsegs[2])-1);
      }
    }
  }

  let last_delim_idx = 0;
  while (true) {
    let delim_idx = get_next_idx( last_delim_idx );
    if (delim_idx < 0) {
      let line = obj_str.slice(last_delim_idx);
      parseLine(line);
      break;
    }
    let line = obj_str.slice(last_delim_idx, delim_idx+1);
    parseLine(line);
    last_delim_idx = delim_idx+1;
  }
  // console.log(model.fs[3]);
  // console.log("model.vs len: " + model.fs);
  // console.log(model);
  // console.log("model.vs elem len: " + model.vns[0].length);
  return model;
}

function prepareIntrleavedVNs(model) {
  let vn_arr = [];
  for (let i = 0; i < model.fs.length / 3; i++) {
    for (let j = 0; j < 3; j++) {
      let idx = model.fs[i* 3 + j];
      for (let dim = 0; dim < 3; dim ++) {
        vn_arr.push(model.vs[idx][dim]);
      }
      for (let dim = 0; dim < 3; dim ++) {
        vn_arr.push(model.vns[model.fns[i* 3 + j]][dim]);
      }
    }
  }
  return vn_arr;
}

function test() {
  parseObj(ico_sphere_obj);
}

function main() {
  // const vsSource = getTextContent("vshader");
  // const fsSource = getTextContent("fshader");
  const canvas = document.querySelector("#glCanvas");
  const gl = canvas.getContext("webgl");
  const ext = gl.getExtension('WEBGL_depth_texture');

  const ico_sphere_model = parseObj(ico_sphere_obj);
  const plane_model = parseObj(plane_obj);
  const quad_model = parseObj(quad);

  let models = [ico_sphere_model, plane_model];
  // let models = [ico_sphere_model];

  if (gl == null) {
    alert("unable to initializa webgl.")
    return;
  }

  const lightShaderProgram = initShaderProgram(gl, light_vs, empty_fs);
  const lightProgramInfo = {
    program: lightShaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(lightShaderProgram, 'vertexPos')
    },
    uniformLocation: {
      V: gl.getUniformLocation(lightShaderProgram, 'uV'),
      P: gl.getUniformLocation(lightShaderProgram, 'uP')
    }
  }
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'vertexPos'),
      vertexNormal: gl.getAttribLocation(shaderProgram, 'vertexNorm')
    },
    uniformLocation: {
      M: gl.getUniformLocation(shaderProgram, 'uM'),
      V: gl.getUniformLocation(shaderProgram, 'uV'),
      P: gl.getUniformLocation(shaderProgram, 'uP'),
      lightV: gl.getUniformLocation(shaderProgram, 'uV_light'),
      lightP: gl.getUniformLocation(shaderProgram, 'uP_light'),
      lightPos: gl.getUniformLocation(shaderProgram, 'lightPos'),
      tex1: gl.getUniformLocation(shaderProgram, 'depthMap')
    }
  };

  const buffers = initBuffers(gl, models);
  const matrices = createMatrices(gl);
  textureInfo = defineTexture(gl);
  drawFromLight(gl, lightProgramInfo, buffers, textureInfo, matrices);
  drawScene(gl, programInfo, buffers, textureInfo, matrices);
}

// initializa shaders

function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource)
  const frgmntShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource)

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

function initBuffers(gl, models) {
  const posNormBuffer = gl.createBuffer();

  let vn_arr = [];
  let total_face_num = 0;

  for ( const model of models ) {
    vn_arr = vn_arr.concat(prepareIntrleavedVNs(model));
    total_face_num += model.fs.length;
  }

  console.log('total_face_num: ' + total_face_num);

  // console.log("vn_arr: ", vn_arr);
  gl.bindBuffer(gl.ARRAY_BUFFER, posNormBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vn_arr), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return {
    position_normal: posNormBuffer,
    total_face_num: total_face_num
  };
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

function defineTexture(gl) {
  const targetTextureWidth = 1024;
  const targetTextureHeight = 1024;
  const targetTexture = gl.createTexture();
  const col_texture = gl.createTexture();
  const frameBuffer = gl.createFramebuffer();

  gl.bindTexture(gl.TEXTURE_2D, targetTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, targetTextureWidth, targetTextureHeight, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, targetTexture, 0);

  const error = gl.getError();
  console.log("error: ", error);

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status == gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT) {
    console.log("FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
  } else if (status == gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT) {
    console.log("FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
  } else if (status == gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS) {
    console.log("FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
  } else if (status == gl.FRAMEBUFFER_UNSUPPORTED) {
    console.log("FRAMEBUFFER_UNSUPPORTED");
  } else if (status == gl.FRAMEBUFFER_COMPLETE) {
    console.log("FRAMEBUFFER_COMPLETE");
  }

  return {
    texWidth: 1024,
    texHeight: 1024,
    frameBuffer: frameBuffer,
    targetTexture: targetTexture,
    col_texture: col_texture
  }
}

function createMatrices(gl) {
  lightProjMatrix = mat4.create();
  lightProjMatrix = mat4.perspective(lightProjMatrix, 90 * Math.PI / 180, 1, 0.1, 100);
  lightViewMatrix = mat4.create();
  lightViewMatrix = mat4.lookAt(lightViewMatrix, lightLocation, [0.0, 0.0, 0.0], [0.0, 1.0, 0.0]);
  projMatrix = getProjMatrix(gl.canvas.clientWidth, gl.canvas.clientHeight);
  viewMatrix = mat4.create();
  mat4.translate(viewMatrix, viewMatrix, [0, 0, -7]);
  modlMatrix = mat4.create();

  return {
    lightProjMatrix: lightProjMatrix,
    lightViewMatrix: lightViewMatrix,
    projMatrix: projMatrix,
    viewMatrix: viewMatrix,
    modlMatrix: modlMatrix
  }
}

function drawFromLight(gl, programInfo, buffer, textureInfo, matrices) {
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.DEPTH_BUFFER_BIT);

  gl.bindFramebuffer(gl.FRAMEBUFFER, textureInfo.frameBuffer);
  // gl.bindTexture(gl.TEXTURE_2D, textureInfo.targetTexture);
  gl.viewport(0, 0, textureInfo.texWidth, textureInfo.texHeight);

  gl.useProgram(programInfo.program);
  gl.uniformMatrix4fv(programInfo.uniformLocation.V, false, matrices.lightViewMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocation.P, false, matrices.lightProjMatrix);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position_normal);
  gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

  gl.drawArrays(gl.TRIANGLES, 0, buffer.total_face_num * 3);
}

function drawScene(gl, programInfo, buffer, textureInfo, matrices) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(programInfo.program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position_normal);
  gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

  gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, true, 24, 12);
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);

  gl.uniformMatrix4fv(programInfo.uniformLocation.P, false, matrices.projMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocation.V, false, matrices.viewMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocation.M, false, matrices.modlMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocation.lightV, false, matrices.lightViewMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocation.lightP, false, matrices.lightProjMatrix);
  gl.uniform3fv(programInfo.uniformLocation.lightPos, [-5, 5, 1]);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textureInfo.targetTexture);

  gl.drawArrays(gl.TRIANGLES, 0, buffer.total_face_num * 3);
}

window.onload = main;
// window.onload = test;
