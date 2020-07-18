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

function parseObj(obj_str) {
  const model = {
    vs: [],
    vns: [],
    fs: []
  };

  let get_next_idx = function(start_idx) {
    return obj_str.indexOf("\n", start_idx);
  }

  let parseLine = function(line) {
    if (line.startsWith("vn")) {
      let segs = line.split(" ");
      // model.vns.push([parseFloat(segs[1]), parseFloat(segs[2]), parseFloat(segs[3])]);
      model.vns.push(parseFloat(segs[1]), parseFloat(segs[2]), parseFloat(segs[3]));
    }
    else if (line.startsWith("v")) {
      let segs = line.split(" ");
      // model.vs.push([parseFloat(segs[1]), parseFloat(segs[2]), parseFloat(segs[3])]);
      model.vs.push(parseFloat(segs[1]), parseFloat(segs[2]), parseFloat(segs[3]));
    }
    else if (line.startsWith("f")) {
      let segs = line.split(" ");
      // face = []
      for (let i = 1; i < 4; i++) {
        fsegs = segs[i].split("/")
        // face.push([parseInt(fsegs[0]), parseInt(fsegs[1]), parseInt(fsegs[2])]);
        model.fs.push(parseInt(fsegs[0])-1);
      }
      // model.fs.push(face);
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
  console.log("model.fs len: " + model.vs.length / 3);
  // console.log("model.vs elem len: " + model.vns[0].length);
  return model;
}

function test() {
  parseObj(ico_sphere_obj);
}

function main() {
  const vsSource = getTextContent("vshader");
  const fsSource = getTextContent("fshader");
  const canvas = document.querySelector("#glCanvas");
  const gl = canvas.getContext("webgl");
  const model = parseObj(ico_sphere_obj);

  if (gl == null) {
    alert("unable to initializa webgl.")
    return;
  }

  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'vertexPos')
      // vertexNormal: gl.getAttribLocation(shaderProgram, 'vertexNorm')
    },
    uniformLocation: {
      M: gl.getUniformLocation(shaderProgram, 'uM'),
      V: gl.getUniformLocation(shaderProgram, 'uV'),
      P: gl.getUniformLocation(shaderProgram, 'uP')
      // lightPos: gl.getUniformLocation(shaderProgram, 'lightPos')
    }
  };

  const buffers = initBuffers(gl, model);
  drawScene(gl, programInfo, buffers, model);
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

function initBuffers(gl, model) {
  const positionBuffer = gl.createBuffer();
  const elementBuffer = gl.createBuffer();
  // const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vs), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.fs), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  // gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vns), gl.STATIC_DRAW);
  return {
    position: positionBuffer,
    element: elementBuffer
    // normal: normalBuffer
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
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.element);
    // gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, true, 0, 0);
    // gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);
  }
  gl.useProgram(programInfo.program);
  gl.uniformMatrix4fv(programInfo.uniformLocation.P, false, projMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocation.V, false, viewMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocation.M, false, modlMatrix);
  // gl.uniform3fv(programInfo.uniformLocation.lightPos, vec3(-5, 5, 1));

  gl.drawElements(gl.TRIANGLES, model.fs.length, gl.UNSIGNED_SHORT, 0);
}

window.onload = main;
// window.onload = test;
