function start() {

  var canvas = document.getElementById("mycanvas");
  var gl = canvas.getContext("webgl");

  // the model is based off a free .obj file making a hand from this website:
  // https://free3d.com/3d-model/hand-v1--675788.html
  var obj_model = my_model;
  
  var triangleIndexSize = gl.UNSIGNED_INT;
  switch (obj_model.triangleIndices.BYTES_PER_ELEMENT) {
    case 1:
      triangleIndexSize = gl.UNSIGNED_BYTE;
      break;
    case 2:
      triangleIndexSize = gl.UNSIGNED_SHORT;
      break;
    case 4:
      gl.getExtension('OES_element_index_uint');
      triangleIndexSize = gl.UNSIGNED_INT;
      break;
    default:
      throw new Error('unknown triangle index element size');
  }

  var slider1 = document.getElementById('slider1');
  slider1.value = 0;
  var slider2 = document.getElementById('slider2');
  slider2.value = 0;

  var vertexSource = document.getElementById("vertexShader").text;
  var fragmentSource = document.getElementById("fragmentShader").text;

  var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexSource);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(vertexShader)); return null;
  }

  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentSource);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(fragmentShader)); return null;
  }

  var shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Could not initialize shaders");
  }
  gl.useProgram(shaderProgram);

  shaderProgram.PositionAttribute = gl.getAttribLocation(shaderProgram, "vPosition");
  gl.enableVertexAttribArray(shaderProgram.PositionAttribute);

  shaderProgram.NormalAttribute = gl.getAttribLocation(shaderProgram, "vNormal");
  gl.enableVertexAttribArray(shaderProgram.NormalAttribute);

  shaderProgram.texcoordAttribute = gl.getAttribLocation(shaderProgram, "vTexCoord");
  gl.enableVertexAttribArray(shaderProgram.texcoordAttribute);

  shaderProgram.MVmatrix = gl.getUniformLocation(shaderProgram, "uMV");
  shaderProgram.MVNormalmatrix = gl.getUniformLocation(shaderProgram, "uMVn");
  shaderProgram.MVPmatrix = gl.getUniformLocation(shaderProgram, "uMVP");

  shaderProgram.texSampler1 = gl.getUniformLocation(shaderProgram, "texSampler1");
  gl.uniform1i(shaderProgram.texSampler1, 0);
  shaderProgram.texSampler2 = gl.getUniformLocation(shaderProgram, "texSampler2");
  gl.uniform1i(shaderProgram.texSampler2, 1);

  var trianglePosBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, trianglePosBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, obj_model.vertexPos, gl.STATIC_DRAW);
  trianglePosBuffer.itemSize = 3;
  trianglePosBuffer.numItems = obj_model.vertexPos.length;

  var triangleNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, obj_model.vertexNormals, gl.STATIC_DRAW);
  triangleNormalBuffer.itemSize = 3;
  triangleNormalBuffer.numItems = obj_model.vertexNormals.length;

  var textureBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, obj_model.vertexTextureCoords, gl.STATIC_DRAW);
  textureBuffer.itemSize = 2;
  textureBuffer.numItems = obj_model.vertexTextureCoords.length;

  var indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, obj_model.triangleIndices, gl.STATIC_DRAW);

  var texture1 = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  var image1 = new Image();

  var texture2 = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texture2);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  var image2 = new Image();

  // the structure of how I load the textures to be drawn is used from the 
  // in class example: https://jsbin.com/zivofiw/edit?html,js,output
  function initTextureThenDraw() {
      image1.onload = function() { loadTexture(image1,texture1); };
      image1.crossOrigin = "anonymous";
      image1.src = "https://live.staticflickr.com/5726/30206830053_87e9530b48_b.jpg";

      image2.onload = function() { loadTexture(image2,texture2); };
      image2.crossOrigin = "anonymous";
      image2.src = "https://live.staticflickr.com/5726/30206830053_87e9530b48_b.jpg";

      window.setTimeout(draw,200);
  }

  function loadTexture(image,texture) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }

  function draw() {

    var camera_angle = slider1.value * 0.01 * Math.PI;
    var hand_angle = slider2.value * 0.01 * Math.PI;

    var eye = [400 * Math.sin(camera_angle), 150.0, 400.0 * Math.cos(camera_angle)];
    var target = [0, 0, 0];
    var up = [0, 1, 0];

    w = obj_model.bboxMax[0] - obj_model.bboxMin[0]
    h = obj_model.bboxMax[1] - obj_model.bboxMin[1]
    d = obj_model.bboxMax[2] - obj_model.bboxMin[2]
    s = 200 / Math.max(w, h, d);

    var tModel = mat4.create();
    mat4.fromScaling(tModel, [s, s, s])

    mat4.rotate(tModel, tModel, hand_angle, [w, h, d]);

    offset = [
      -(obj_model.bboxMax[0] + obj_model.bboxMin[0]) / 2,
      -(obj_model.bboxMax[1] + obj_model.bboxMin[1]) / 2,
      -(obj_model.bboxMax[2] + obj_model.bboxMin[2]) / 2];
    mat4.translate(tModel, tModel, offset);

    var tCamera = mat4.create();
    mat4.lookAt(tCamera, eye, target, up);

    var tProjection = mat4.create();
    mat4.perspective(tProjection, Math.PI / 4, 1, 10, 1000);

    var tMV = mat4.create();
    var tMVn = mat3.create();
    var tMVP = mat4.create();
    mat4.multiply(tMV, tCamera, tModel); 
    mat3.normalFromMat4(tMVn, tMV);
    mat4.multiply(tMVP, tProjection, tMV);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(shaderProgram.MVmatrix, false, tMV);
    gl.uniformMatrix3fv(shaderProgram.MVNormalmatrix, false, tMVn);
    gl.uniformMatrix4fv(shaderProgram.MVPmatrix, false, tMVP);

    gl.bindBuffer(gl.ARRAY_BUFFER, trianglePosBuffer);
    gl.vertexAttribPointer(shaderProgram.PositionAttribute, trianglePosBuffer.itemSize,
      gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.NormalAttribute, triangleNormalBuffer.itemSize,
      gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.vertexAttribPointer(shaderProgram.texcoordAttribute, textureBuffer.itemSize,
      gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture2);
    
    gl.drawElements(gl.TRIANGLES, obj_model.triangleIndices.length, triangleIndexSize, 0);

  }

  slider1.addEventListener("input", draw);
  slider2.addEventListener("input", draw);
  initTextureThenDraw();
}

window.onload = start;
