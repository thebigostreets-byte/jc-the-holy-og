// Keep flight modes mutually consistent as the player switches abilities.
export function transitionFlight(state, action) {
  const current = {
    flying: false, hypersonic: false, glide: false, diving: false,
    height: 0, descending: 0, ...state
  };
  switch (action) {
    case 'takeoff':
      return {...current, flying:true, hypersonic:false, glide:false, diving:false, height:Math.max(6,current.height), descending:0};
    case 'boost': {
      const start = current.flying ? current : transitionFlight(current,'takeoff');
      return {...start, hypersonic:!current.hypersonic, glide:false, diving:false, height:Math.max(18,start.height), descending:0};
    }
    case 'surge': {
      const start=current.flying?current:transitionFlight(current,'takeoff');
      return {...start,hypersonic:true,glide:false,diving:false,height:Math.max(18,start.height),descending:0};
    }
    case 'hover':
      return {...current, flying:true, hypersonic:false, glide:false, diving:false, height:current.flying?Math.max(5,current.height):5, descending:0};
    case 'leap':
      return {...current, flying:true, hypersonic:false, glide:false, diving:false, height:Math.min(250,current.height+14), descending:0};
    case 'glide': {
      const start = current.flying ? current : transitionFlight(current,'takeoff');
      return {...start, hypersonic:false, glide:!current.glide, diving:false, height:Math.max(8,start.height), descending:0};
    }
    case 'sky-lift':
      return {...current, flying:true, hypersonic:false, glide:false, diving:false, height:Math.min(250,current.height+28), descending:0};
    case 'dive':
      return current.flying ? {...current, hypersonic:false, glide:false, diving:true, descending:2} : current;
    case 'land':
      return {...current, flying:false, hypersonic:false, glide:false, diving:false, descending:1};
    case 'touchdown':
    case 'recall':
      return {...current, flying:false, hypersonic:false, glide:false, diving:false, height:0, descending:0};
    case 'impact':
      return {...current, flying:false, hypersonic:false, glide:false, diving:false, height:0, descending:0};
    default:
      return current;
  }
}

export function shouldTouchDown(flying,previousHeight,height,verticalVelocity){return flying&&previousHeight>0&&height===0&&verticalVelocity<=0;}
