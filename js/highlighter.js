// ---- boring utility-functions first

// used to defer handling of scroll-events to the next 
// animation-frame without risking to run the code multiple
// times if the event fires multiple times during a frame
const debouncedRAF = (function() {
  let frameId = null;

  return fn => ev => {
    if (frameId !== null) { return; }
    
    frameId = requestAnimationFrame(time => {
      fn(time);
      frameId = null;
    });
  };
}) ();

// regular debounce-function. `fn` will be called by the 
// returned function  after it has not been called for
// `time` milliseconds.
function debounce(fn, time) {
  let timerId = null;

  return (...args) => {
    if (timerId) {
      clearTimeout(timerId);
    }

    timerId = setTimeout(() => fn(...args), time);
  }
}

// get the page-relative offsetTop of an element
function getPageOffsetTop(el) {
  let offset = 0, node = el;

  do {
    offset += node.offsetTop;
  } while(node = node.offsetParent);

  return offset;
}



// ---- now the interesting part

// creates a scroll-highlighter for the specified list of elements.
//
// Usage:
// 
//     const highlighter = scrollHighlighter(elements);
//
//     // if you need to add elements later, use this:
//     highlighter.elements.push(newElements);
//
//     // call this from a scroll-event or animation-frame 
//     // with the scroll-position (updates css-variables of elements):
//     highlighter.update(scrollTop);
//
//     // finally, make sure to update cached positions if 
//     // page-geometry changes (eg. window.onresize):
//     highlighter.reflow();
//
// And thats it.
function scrollHighlighter(elements) {
  const START_OFFSET = 0.3;
  const END_OFFSET = 0.7;

  // cache for page-relative offsetTop per element
  const offsets = new WeakMap();
  
  const instance = {
    // the elements handled by this instance. 
    // Feel free to add more elements after creation 
    elements: Array.from(elements),

    // update all elements with a new scroll-position, should be 
    // called from the scroll-event.
    // highlighting of an element will begin when the element 
    // is 30% within the viewport and should end when it's at 70%
    // (measured from bottom to top)
    update(scrollTop) {
      const endAt = END_OFFSET;
      
      this.elements.forEach(el => {
        const elOffset = offsets.get(el);
        const relPosition = 1 - (elOffset - scrollTop) / this.windowHeight;

        // readjust startAt to a certain extent if the element 
        // would normally be partly highlighted at page-load
        let startAt = START_OFFSET;
        const startOffset = this.windowHeight * (1 - startAt);
        if (startOffset > elOffset) {
          startAt = Math.min(endAt, 1 - elOffset/this.windowHeight);
        }
        
        const progress = (relPosition - startAt) / (endAt - startAt);
        const clampedProgress = Math.min(1, Math.max(0, progress));
        
        // i love this so much...
        el.style.setProperty(
            '--highlight-range', 
            (clampedProgress * 100).toFixed(0) + '%'
        );
      });
    },

    // prevent sync reflows by caching the top-offsets 
    // for all elements.
    // must be called whenever the list of elements or 
    // their position on the page changes (best bet:
    // window.resize)
    reflow() {
      this.windowHeight = window.innerHeight;      
      this.elements.forEach(el => {
        offsets.set(el, getPageOffsetTop(el));
      });
    }
  };
  
  // make .elements.push work properly
  instance.elements.push = (...args) => {
    const result = Array.prototype.push.call(instance.elements, ...args);
    instance.reflow();

    return result;
  }
  
  // initialize
  instance.reflow();
  instance.update(0); 
  
  return instance;
}


// finally: create the highlighter and bind events
const hl = scrollHighlighter(document.querySelectorAll('.highlight'));

window.addEventListener('resize', debounce(() => hl.reflow(), 100));
document.addEventListener('scroll', debouncedRAF(() => {
  hl.update(window.pageYOffset || document.documentElement.scrollTop);
}));
                                                 

