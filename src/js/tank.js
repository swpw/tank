const makeCamera = (fov = 75) => {
  const aspect = window.innerWidth/window.innerHeight,
        near = 0.1,
        far = 1000;

  return new THREE.PerspectiveCamera(fov, aspect, near, far);
}

const raycaster = new THREE.Raycaster(),
      mouse = new THREE.Vector2(),
      activeKeys = {
        87: false,  // w
        83: false,  // s
        65: false,  // a
        68: false,   // d
        37: false,  // left
        38: false,  // up
        39: false,  // right
        40: false   // down
      },
      changeColor = [],
      rotateCylinders = [],
      fullwidth = document.body.offsetWidth / 16.5,
      fullheight = document.body.offsetHeight / 16.5,
      tankMaterials = [];

let activeCamera = 'default',
    isTankLoaded = false,
    model,
    radiusUUID;



(()=>{

  /* Renderer */
  const renderer = new THREE.WebGLRenderer({antialias: true});

  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth,window.innerHeight);
  renderer.setClearColor(0x7ec0ee, 1); // Color , Alpha

  document.body.appendChild( renderer.domElement );


  /* Scene and OBJ 3D*/
  const scene = new THREE.Scene();

  // Tank's object
  const tankObj = new THREE.Object3D();
  tankObj.position.set(0, .1, 0)
  scene.add(tankObj);


  /* Cameras */
  const camera = makeCamera();

  camera.position.set(0, 50, 0)
  camera.lookAt(0, 0, 0);


  const tankCamera = makeCamera()

  tankCamera.position.set(0, 3, 3).multiplyScalar(1.5);
  tankCamera.rotation.x = -30 * (Math.PI / 180)

  tankObj.add(tankCamera)


  const rearCamera = makeCamera()

  rearCamera.position.y = 3;
  rearCamera.position.z = -8;
  rearCamera.rotation.y = Math.PI;

  tankObj.add(rearCamera)


  const barrelCamera = makeCamera()

  barrelCamera.position.y = 3;
  barrelCamera.position.z = -15;


  /* Resize */
  window.addEventListener('resize', () => {
    const { innerHeight, innerWidth } = window;

    renderer.setSize(innerWidth, innerHeight);

    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();

    tankCamera.aspect = innerWidth / innerHeight;
    tankCamera.updateProjectionMatrix();

    rearCamera.aspect = innerWidth / innerHeight;
    rearCamera.updateProjectionMatrix();

    barrelCamera.aspect = innerWidth / innerHeight;
    barrelCamera.updateProjectionMatrix();
  });


  /* Lights */
  {
    const light1 = new THREE.DirectionalLight(0xffffff, 1)

    light1.position.set(0, 20, 0);

    light1.castShadow = true;
    light1.shadow.mapSize.width = 2048;
    light1.shadow.mapSize.height = 2048;

    const d = 50;
    light1.shadow.camera.left = - fullwidth / 2;
    light1.shadow.camera.right = fullwidth / 2;
    light1.shadow.camera.top = fullheight / 2;
    light1.shadow.camera.bottom = - fullheight / 2;
    light1.shadow.camera.near = 5;
    light1.shadow.camera.far = 21;
    light1.shadow.bias = 0.001;

    scene.add(light1);
  }

  {
    const light2 = new THREE.HemisphereLight( '#fff', '#080418', 1 );
    scene.add( light2 );
  }


  /* Ground */
  {
  const geometry = new THREE.PlaneGeometry( fullwidth, fullheight ),
        material = new THREE.MeshPhongMaterial( {color: '#409656'} ),
        groundMesh = new THREE.Mesh( geometry, material );

  groundMesh.rotation.x = Math.PI * -.5;
  groundMesh.receiveShadow = true;

  scene.add( groundMesh );
  changeColor.push(groundMesh)
  }


  /* Tanks mouse turret max radius geometry */
  {
  const geometry = new THREE.CircleGeometry( 12.5, 32 ),
        material = new THREE.MeshPhongMaterial( {color: '#000'} ),
        circleMesh = new THREE.Mesh( geometry, material );

  circleMesh.rotation.x = Math.PI * -.5;

  radiusUUID = circleMesh.uuid

  tankObj.add( circleMesh );

  circleMesh.castShadow = true
  circleMesh.receiveShadow = true
  }


  /* Reference Cylinders */
  {
    const createCylinder = color => {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry( 5, 5, 5 ),
        new THREE.MeshPhongMaterial( {color} )
      )

      mesh.receiveShadow = true;
      mesh.castShadow = true;

      return mesh
    }

    const cylinder1 = createCylinder('#4b42b1')
    cylinder1.position.set(
      -(fullwidth / 2) + 5,
      10,
      -( fullheight / 2) + 5
    )
    scene.add(cylinder1)

    const cylinder2 = createCylinder('#aa0495')
    cylinder2.position.set(
      (fullwidth / 2) - 5,
      10,
      -( fullheight / 2) + 5
    )
    scene.add(cylinder2)

    const cylinder3 = createCylinder('#75e3d1')
    cylinder3.position.set(
      (fullwidth / 2) - 5,
      10,
      ( fullheight / 2) - 5
    )
    scene.add(cylinder3)

    const cylinder4 = createCylinder('#ebdba2')
    cylinder4.position.set(
      -(fullwidth / 2) + 5,
      10,
      ( fullheight / 2) - 5
    )
    scene.add(cylinder4)

    changeColor.push(cylinder1)
    changeColor.push(cylinder2)
    changeColor.push(cylinder3)
    changeColor.push(cylinder4)
    rotateCylinders.push(cylinder1)
    rotateCylinders.push(cylinder2)
    rotateCylinders.push(cylinder3)
    rotateCylinders.push(cylinder4)
  }


  /* Tank loader */
  const loader = new THREE.GLTFLoader();

  loader.load('/assets/tank.gltf', gltf => {
      console.log('loaded file', gltf)

      model = gltf.scene
      model.position.set(0, 0.1, 2)
      tankObj.add(model)

      model.children[0].children[2].children[0].add(barrelCamera)

      loadTankEvents()

      isTankLoaded = true


      model.traverse(child => {
        if(child instanceof THREE.Mesh){
          child.material = new THREE.MeshPhongMaterial({color: '#fff'})
          tankMaterials.push(child.material)

          child.castShadow = true;
          child.receiveShadow = true;
        }
      })

  	},
    xhr => console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' ),
    err => console.log( 'An error happened' )
  )


  /*                                                      */


  /* Tank event listeners */
  const loadTankEvents = () => {
    window.addEventListener('keydown', ({keyCode}) => {
      const isFalse = keystroke => keystroke === keyCode ? activeKeys[keystroke] = true : null;

      switch (keyCode) {
        case 87:
          isFalse(87)
          break;
        case 83:
          isFalse(83)
          break;
        case 65:
          isFalse(65)
          break;
        case 68:
          isFalse(68)
          break;
        case 37:
          isFalse(37)
          break;
        case 38:
          isFalse(38)
          break;
        case 39:
          isFalse(39)
          break;
        case 40:
          isFalse(40)
          break;
        default:
          return
      }
    });

    window.addEventListener('keyup', ({keyCode}) => activeKeys[keyCode] = false);

    window.addEventListener('mousemove', e => {
      mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    })

    window.addEventListener('wheel', e => moveBarrel(e))
  };


  /* Tank movement */
  const runTank = () => {
    for(let key in activeKeys){
      key = parseInt(key)

      if(activeKeys[key] === true){

        switch (key) {
          case 87:
            if(tankObj.position.z < - fullheight / 2.25){
              tankObj.translateZ(2.5)
            }else if(tankObj.position.z > fullheight / 2.25){
              tankObj.translateZ(2.5)
            }else if(tankObj.position.x < -fullwidth / 2.25){
              tankObj.translateZ(2.5)
            }else if(tankObj.position.x > fullwidth / 2.25){
              tankObj.translateZ(2.5)
            }else{
              tankObj.translateZ(-0.15)
            }
            break;
          case 83:
            if(tankObj.position.z < -fullheight / 2.25){
              tankObj.translateZ(-2.5)
            }else if(tankObj.position.z > fullheight / 2.25){
              tankObj.translateZ(-2.5)
            }else if(tankObj.position.x < -fullwidth / 2.25){
              tankObj.translateZ(-2.5)
            }else if(tankObj.position.x > fullwidth / 2.25){
              tankObj.translateZ(-2.5)
            }else{
              tankObj.translateZ(0.15)
            }
            break;
          case 65:
            TweenMax.to(tankObj.rotation, .3, {y: '+= .1'})
            break;
          case 68:
            TweenMax.to(tankObj.rotation, .3, {y: '-= .1'})
            break;
          default:
            return
        }
      }
    }
  };

  /* Rotate turret */
  const moveTurret = () => {
    raycaster.setFromCamera( mouse, camera );

  	const intersects = raycaster.intersectObjects( tankObj.children );

  	for ( let i = 0; i < intersects.length; i++ ) {
      if(radiusUUID === intersects[i].object.uuid && isTankLoaded){
        const turret = model.children[0].children[2],
              point = intersects[ i ].point,
              x = point.x,
              z = point.z;

        if(x <= -1 || x >= 1 && z <= -1 || z >= 1){
          turret.lookAt(x, 3, z )
        }
      }
  	}
  }


  /* Move barrel up or down */
  const moveBarrel = e => {
    const barrell = model.children[0].children[2].children[0]

    if(e.wheelDeltaY < 0){
      if(barrell.rotation.x > -.125)
        TweenMax.to(barrell.rotation, 1, {x: '-= .033'})
    }else{
      if(barrell.rotation.x < .3)
        TweenMax.to(barrell.rotation, 1, {x: '+= .033'})
    }
  }


  /* Switch camera */
  window.addEventListener('keyup', ({keyCode}) => {
    switch (keyCode) {
      case 49:  // 1
        activeCamera = 'default'
        break;
      case 50:  // 2
        activeCamera = 'tankCamera'
        break;
      case 51:  // 3
        activeCamera = 'rearCamera'
        break;
      case 52:  // 4
        activeCamera = 'barrelCamera'
        break;
      default:
        return
    }
  })

  /* Rotate turret with arrow keys */
  const manualTurretRotation = () => {
    if(isTankLoaded){
      const turret = model.children[0].children[2],
            barrell = model.children[0].children[2].children[0];

      for(let key in activeKeys){
        key = parseInt(key)

        if(activeKeys[key] === true){

          switch (key) {
            case 37:  // left
              turret.rotateY(2.5 * (Math.PI / 180))
              break;
            case 38:  // up
              if(barrell.rotation.x < .3)
                TweenMax.to(barrell.rotation, .3, {x: '+= .033'})
              break;
            case 39:  // right
              turret.rotateY(-2.5 * (Math.PI / 180))
              break;
            case 40:  // down
              if(barrell.rotation.x > -.125)
                TweenMax.to(barrell.rotation, .3, {x: '-= .033'})
              break;
            default:
              return
          }

        }
      }
    }
  };


  /** Change objects color */
  setInterval(()=>{
    if(changeColor.length > 0) {
      changeColor.forEach(e => {
        TweenMax.to(e.material.color, 1, {
          r: Math.random(),
          g: Math.random(),
          b: Math.random(),
          ease: Power1.easeIn
        })
      })
    }
  }, 4 * 1000)


  /* Change tanks color */
  window.addEventListener('keyup', ({keyCode}) => {
    if(keyCode === 32){
      if(tankMaterials.length > 0){
        tankMaterials.forEach(e => {
          TweenMax.to(e.color, .3, {
            r: Math.random(),
            g: Math.random(),
            b: Math.random(),
            ease: Power1.easeIn
          })
        })
      }
    }
  })


  /*                                                      */


  // Render loop
  const onAnimationFrameHandler = time => {
    runTank()
    moveTurret()
    manualTurretRotation()

    switch (activeCamera) {
      case 'default':
        renderer.render(scene, camera);
        break;
      case 'tankCamera':
        renderer.render(scene, tankCamera);
        break;
      case 'rearCamera':
        renderer.render(scene, rearCamera);
        break;
      case 'barrelCamera':
        renderer.render(scene, barrelCamera);
        break;
      default:
        renderer.render(scene, camera);
    }

    rotateCylinders.forEach(e => e.rotation.y += .01)

    window.requestAnimationFrame(onAnimationFrameHandler);
  }
  window.requestAnimationFrame(onAnimationFrameHandler);

})();
