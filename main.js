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
  console.log(model);
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

  const ico_sphere_model = parseObj(ico_sphere_obj);
  const plane_model = parseObj(plane_obj);

  let models = [ico_sphere_model, plane_model];

  if (gl == null) {
    alert("unable to initializa webgl.")
    return;
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
      lightPos: gl.getUniformLocation(shaderProgram, 'lightPos')
    }
  };

  const buffers = initBuffers(gl, models);
  drawScene(gl, programInfo, buffers);
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

function drawScene(gl, programInfo, buffer, model) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  projMatrix = getProjMatrix(gl.canvas.clientWidth, gl.canvas.clientHeight);

  // projMatrix = mat4.ortho(projMatrix, -2, 2, -2, 2, 0.1, 100);
  // viewMatrix = getViewMatrix([5, 0, 0], [0, 0, 0]);
  viewMatrix = mat4.create();
  mat4.translate(viewMatrix, viewMatrix, [0, 0, -7]);
  // console.log(viewMatrix);
  modlMatrix = mat4.create();

  {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position_normal);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, true, 24, 12);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);

    // gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);
  }
  gl.useProgram(programInfo.program);
  gl.uniformMatrix4fv(programInfo.uniformLocation.P, false, projMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocation.V, false, viewMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocation.M, false, modlMatrix);
  gl.uniform3fv(programInfo.uniformLocation.lightPos, [-5, 5, 1]);

  gl.drawArrays(gl.TRIANGLES, 0, buffer.total_face_num * 3);
}

window.onload = main;
// window.onload = test;
