import React from 'react';
import Immutable from 'immutable';
// import Dimensions from 'react-dimensions';

import Track from './Track';
import Step from './Step';
import Handle from './Handle';
import Range from './Range';

const defaultHandle = {
  index: 0,
  id: null,
  value: 1, // should be same as default config value
  label: null,
  left: 0,
  top: 0,
  x: 0, // step center x
  y: 0, // step center y
  className: null,
};

const defaultStep = {
  id: null,
  index: 0,
  label: null,
  value: 0,
  isVisible: false,
  left: 0,
  top: 0,
  x: 0, // step center x
  y: 0, // step center y
  inRange: null, // index of the range this step belongs to
  className: null,
};

const defaultRange = {
  id: null,
  index: 0,
  label: null,
  fromHandle: -1, // by default from left border to first handle
  className: null,
  includeHandles: false,
  left: 0,
  top: 0,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

const defaultConfig = {
  orientation: 'horizontal',
  steps: null,
  showSteps: false,
  value: 1,
  step: 1,
  min: 1,
  max: 10,
  range: false,
  handles: null,
  ranges: null,
  spring: {
    stiffness: 1000,
    damping: 40, // how much spring goes back and forth
    precision: 0.01,
  },
};

// default for this.state
const initialState = {
  container: {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  },
  handles: [defaultHandle],
  handleLength: 0,
  handleGauge: 0,
  steps: [defaultStep],
  stepLength: 0,
  stepGauge: 0,
  ranges: [],
  track: {
    left: 0, // track top left corner num pixels from window left border
    top: 0, // track top left corner num pixels from window top border
    length: 0, // track length (independent of orientation)
    gauge: 0, // track width (independent of orientation)
  },
  isHandleMoving: false,
  movingHandleIndex: 0,
  movingHandlePosition: 0,
};

/**
 * Helper for preparing step objects
 */
const prepareSteps = (config) => {
  // Create steps if they are defined
  let steps = [];
  if (config.steps && config.steps.constructor === Array) {
    // use steps array provided as a prop
    steps = config.steps.map((step, i) => Object.assign({}, defaultStep, {
      id: (step.id) ? step.id : i,
      index: i,
      isVisible: true,
    }, step));
  } else {
    // create steps based on min, max and step values
    for (let i = config.min; i <= config.max; i += config.step) {
      steps.push(Object.assign({}, defaultStep, {
        id: i,
        index: i,
        value: i,
        label: i.toString(),
        isVisible: config.showSteps,
      }));
    }
  }
  return steps;
};

/**
 * Helper for preparing handle objects
 */
const prepareHandles = (config) => {
  // Create handles
  let handles = [defaultHandle];
  if (config.handles && config.handles.length > 0) {
    handles = config.handles.map((data, i) => Object.assign({}, defaultHandle, data, { index: i }));
  } else if (config.value) {
    handles[0].value = config.value;
  }
  return handles;
};

/**
 * Helper for preparing range objects
 */
const prepareRanges = (config) => {
  let ranges = [];
  if (config.ranges && config.ranges.length > 0) {
    ranges = config.ranges.map((data, i) => Object.assign({}, defaultRange, data, { index: i }));
  } else if (config.range) {
    if (config.range === true || config.range === 'below') {
      ranges.push(Object.assign({}, defaultRange));
    } else if (config.range === 'above') {
      ranges.push(Object.assign({}, defaultRange, { id: 0, fromHandle: 0 }));
    }
  }
  return ranges;
};

class SliderInput extends React.Component {
  constructor(props) {
    super(props);
    this.config = Object.assign({}, defaultConfig, this.props);
    this.onHandleCatch = this.onHandleCatch.bind(this);
    this.onHandleMove = this.onHandleMove.bind(this);
    this.onHandleRelease = this.onHandleRelease.bind(this);
    this.onTrackClick = this.onTrackClick.bind(this);
    this.onRangeClick = this.onRangeClick.bind(this);
    this.onStepClick = this.onStepClick.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    // create initial state
    let map = Immutable.fromJS(initialState);
    this.config = Object.assign({}, defaultConfig, this.props);
    // Prepare steps, handles
    const steps = prepareSteps(this.config);
    map = map.set('steps', Immutable.fromJS(steps));
    const handles = prepareHandles(this.config);
    map = map.set('handles', Immutable.fromJS(handles));
    const ranges = prepareRanges(this.config);
    map = map.set('ranges', Immutable.fromJS(ranges));
    // Set map to initial state
    this.state = { map };
  }

  /* global window:false */
  componentDidMount() {
    window.addEventListener('resize', this.onWindowResize);
    const map = this.updatePositions(this.state.map);
    this.setState({ map });
  }
  /*
  componentWillReceiveProps(newProps) {
    let map = this.updatePositions(this.state.map);
    this.setState({ map: map });
  }
  */
  componentWillUnmount() {
    window.removeEventListener('resize', this.onWindowResize);
  }

  onWindowResize() {
    const map = this.updatePositions(this.state.map);
    this.setState({ map });
  }

  onHandleCatch(index, eventX, eventY, deltaX, deltaY) {
    this.updateMovingHandlePositionInState(index, eventX, eventY, deltaX, deltaY);
  }

  onHandleMove(index, eventX, eventY, deltaX, deltaY) {
    this.updateMovingHandlePositionInState(index, eventX, eventY, deltaX, deltaY);
  }

  onHandleRelease(index) {
    let map = this.state.map;
    // Calculate new value for handle by finding closest step to handle
    const movingHandlePosition = map.get('movingHandlePosition');
console.log(movingHandlePosition);
    const closestStep = this.findClosest(map.get('steps'), movingHandlePosition);
console.log(closestStep.get('index'));
    // Snap to closest step
    map = map.setIn(['handles', index, 'value'], closestStep.get('value'));
    // Reset state
    map = map.withMutations((mp) => {
      mp.set('isHandleMoving', false)
        .set('movingHandleIndex', -1)
        .set('movingHandlePosition', null);
    });
    // Single handle position
    const handle = this.calculateHandlePosition(index, map);
    map = map.setIn(['handles', index], handle);

    // Range positions
    const ranges = map.get('ranges').map((range, i) => this.calculateRangePosition(i, map));
    map = map.set('ranges', ranges);
    // Is step in range?
    const steps = map.get('steps').map((step, i) => this.calculateIfStepInRange(i, map));
    map = map.set('steps', steps);
    this.triggerChange(map);
    this.setState({ map });
  }

  onTrackClick(eventX, eventY) {
    let map = this.state.map;
    const trackStart = this.vertical() ? this.state.map.getIn(['track', 'top']) : this.state.map.getIn(['track', 'left']);
    const eventPos = this.vertical() ? eventY : eventX;
    const closestHandle = this.findClosest(map.get('handles'), (eventPos - trackStart));
    const closestStep = this.findClosest(map.get('steps'), (eventPos - trackStart));
    map = map.setIn(['handles', closestHandle.get('index'), 'value'], closestStep.get('value'));

    // Handle positions
    const handles = map.get('handles').map((handle, i) => this.calculateHandlePosition(i, map));
    map = map.set('handles', handles);
    // Range positions
    const ranges = map.get('ranges').map((range, i) => this.calculateRangePosition(i, map));
    map = map.set('ranges', ranges);
    // Is step in range?
    const steps = map.get('steps').map((step, i) => this.calculateIfStepInRange(i, map));
    map = map.set('steps', steps);

    this.triggerChange(map);
    this.setState({ map });
  }

  onRangeClick(eventX, eventY) {
    this.onTrackClick(eventX, eventY);
  }

  onStepClick(stepIndex) {
    console.log("step click");
    let map = this.state.map;
    const step = map.getIn(['steps', stepIndex]);
    const stepPos = this.vertical() ? step.get('y') : step.get('x');
    const closestHandle = this.findClosest(map.get('handles'), stepPos);
    map = map.setIn(['handles', closestHandle.get('index'), 'value'], step.get('value'));

    // Handle positions
    const handles = map.get('handles').map((handle, i) => this.calculateHandlePosition(i, map));
    map = map.set('handles', handles);
    // Range positions
    const ranges = map.get('ranges').map((range, i) => this.calculateRangePosition(i, map));
    map = map.set('ranges', ranges);
    // Is step in range?
    const steps = map.get('steps').map((step, i) => this.calculateIfStepInRange(i, map));
    map = map.set('steps', steps);

    this.triggerChange(map);
    this.setState({ map });
  }

  updatePositions(map) {
    let m = map || this.state.map;
    // Container size
    const containerRect = this.refs.track.getOuterElement().getBoundingClientRect();
    m = m.set('container', Immutable.fromJS({
      left: containerRect.left,
      top: containerRect.top,
      width: containerRect.width,
      height: containerRect.height,
    }));
    // Track dimensions and position
    const trackRect = this.refs.track.getInnerElement().getBoundingClientRect();
    m = m.set('track', Immutable.fromJS({
      left: trackRect.left,
      top: trackRect.top,
      length: this.vertical() ? trackRect.height : trackRect.width,
      gauge: this.vertical() ? trackRect.width : trackRect.height,
    }));
console.log(m.toJS());

    // Step dimensions
    if (this.refs['step-0']) {
      const stepRect = this.refs['step-0'].refs.span.getBoundingClientRect();
      m = m.set('stepLength', this.vertical() ? stepRect.height : stepRect.width);
      m = m.set('stepGauge', this.vertical() ? stepRect.width : stepRect.height);
    }
    // Step positions
    let steps = m.get('steps').map((step, i) => this.calculateStepPosition(i, m));
    m = m.set('steps', steps);

    // Handle dimensions
    const handleRect = this.refs['handle-0'].refs.motion.refs.button.getBoundingClientRect(); // There's always at least one handle
    m = m.set('handleLength', this.vertical() ? handleRect.height : handleRect.width);
    m = m.set('handleGauge', this.vertical() ? handleRect.width : handleRect.height);


    // Handle positions
    const handles = m.get('handles').map((handle, i) => this.calculateHandlePosition(i, m));
    m = m.set('handles', handles);
    // Range positions
    const ranges = m.get('ranges').map((range, i) => this.calculateRangePosition(i, m));
    m = m.set('ranges', ranges);
    // Is step in range?
    steps = m.get('steps').map((step, i) => this.calculateIfStepInRange(i, m));
    m = m.set('steps', steps);

    // Return a map
    return m;
  }



  calculateStepPosition(stepIndex, map) {
    let step = map.getIn(['steps', stepIndex]);
    // const trackStart = this.vertical() ? map.getIn(['track', 'top']) : map.getIn(['track', 'left']);
    const trackLength = map.getIn(['track', 'length']);
    const trackGauge = map.getIn(['track', 'gauge']);
    const stepLength = map.get('stepLength');
    const stepGauge = map.get('stepGauge');
    const trackStart = this.vertical() ? map.getIn(['track', 'top']) : map.getIn(['track', 'left']);
    const containerStart = this.vertical() ? map.getIn(['container', 'top']) : map.getIn(['container', 'left']);

    const trackPadding = trackStart - containerStart;

    const numSteps = map.get('steps') ? map.get('steps').size : 0;

    const stepCenterGauge = trackGauge / 2;
    const stepCenterLength = (stepIndex * ((trackLength) / (numSteps - 1))); // steps over track endings

    const stepPositionGauge = stepCenterGauge - (stepGauge / 2);
    const stepPositionLength = stepCenterLength - (stepLength / 2) + trackPadding;

    if (this.vertical()) {
      step = step.withMutations((st) => {
        st.set('left', stepPositionGauge)
          .set('top', stepPositionLength)
          .set('x', stepCenterGauge)
          .set('y', stepCenterLength);
      });
    } else {
      step = step.withMutations((st) => {
        st.set('left', stepPositionLength)
          .set('top', stepPositionGauge)
          .set('x', stepCenterLength)
          .set('y', stepCenterGauge);
      });
    }
    return step;
  }

  calculateIfStepInRange(stepIndex, map) {
    const step = map.getIn(['steps', stepIndex]);
    const stepCenter = this.vertical() ? step.get('y') : step.get('x');
    // Check if steps belongs to a range
    let inRange = null;
    map.get('ranges').map((range) => {
      const rangeCenterStart = this.vertical() ? range.get('top') : range.get('left');
      const rangeLength = this.vertical() ? range.get('height') : range.get('width');
      // const rangeCenterEnd = rangeLength - rangeCenterStart;
      if (stepCenter >= rangeCenterStart && stepCenter <= (rangeLength + rangeCenterStart)) {
        inRange = range.get('index');
      }
    });
    return step.set('inRange', inRange);
  }

  calculateHandlePosition(handleIndex, map) {
    let handle = map.getIn(['handles', handleIndex]);
    const trackLength = map.getIn(['track', 'length']);
    const trackGauge = map.getIn(['track', 'gauge']);
    const handleLength = map.get('handleLength');
    const handleGauge = map.get('handleGauge');
    const isHandleMoving = map.get('isHandleMoving');
    const movingHandleIndex = map.get('movingHandleIndex');
    const movingHandlePosition = map.get('movingHandlePosition');

    const trackStart = this.vertical() ? map.getIn(['track', 'top']) : map.getIn(['track', 'left']);
    const containerStart = this.vertical() ? map.getIn(['container', 'top']) : map.getIn(['container', 'left']);
    const trackPadding = trackStart - containerStart;

    let handleCenterLength = null;
    const steps = map.get('steps');

    if (isHandleMoving && movingHandleIndex === handleIndex) {
      handleCenterLength = movingHandlePosition;

      if (steps && steps.size > 0) {
        // Snap to steps, if steps are available
        const closestStep = this.findClosest(steps, movingHandlePosition);
        handleCenterLength = this.vertical() ? closestStep.get('y') : closestStep.get('x');
      }

      // Prevent going over borders
      if (movingHandlePosition < 0) {
        handleCenterLength = 0;
      }
      if (movingHandlePosition > trackLength) {
        handleCenterLength = trackLength;
      }

      // Prevent running over next handle
      if (map.hasIn(['handles', (handleIndex + 1)])) {
        const nextHandle = map.getIn(['handles', (handleIndex + 1)]);
        const nextHandlePosition = this.vertical() ? nextHandle.get('y') : nextHandle.get('x');
        if (movingHandlePosition > (nextHandlePosition - handleLength)) {
          handleCenterLength = nextHandlePosition - handleLength;
        }
      }
      // Prevent running over previous handle
      if (handleIndex > 0 && map.hasIn(['handles', (handleIndex - 1)])) {
        const prevHandle = map.getIn(['handles', (handleIndex - 1)]);
        const prevHandlePosition = this.vertical() ? prevHandle.get('y') : prevHandle.get('x');
        if (movingHandlePosition < (prevHandlePosition + handleLength)) {
          handleCenterLength = prevHandlePosition + handleLength;
        }
      }
    } else {
      // If there are steps.
      if (steps && steps.size > 0) {
        // Find matching step by value
        let closestStep = null;
        steps.map((step) => {
          if (step.get('value') === handle.get('value')) {
            closestStep = step;
          }
        });
        // TODO: Prevent dropping handle on the wrong side of next/prev handle
        if (closestStep) {
          handleCenterLength = this.vertical() ? closestStep.get('y') : closestStep.get('x');
        }
      } else {
        // No steps are used on track. Use
      }
    }

    const handleCenterGauge = trackGauge / 2;
    const handlePositionLength = handleCenterLength - (handleLength / 2) + trackPadding;
    const handlePositionGauge = handleCenterGauge - (handleGauge / 2);

    if (this.vertical()) {
      handle = handle.withMutations((st) => {
        st.set('left', handlePositionGauge)
          .set('top', handlePositionLength)
          .set('x', handleCenterGauge)
          .set('y', handleCenterLength);
      });
    } else {
      handle = handle.withMutations((st) => {
        st.set('left', handlePositionLength)
          .set('top', handlePositionGauge)
          .set('x', handleCenterLength)
          .set('y', handleCenterGauge);
      });
    }
    return handle;
  }

  calculateRangePosition(rangeIndex, map) {
    const trackLength = map.getIn(['track', 'length']);
    const trackGauge = map.getIn(['track', 'gauge']);
    const handleLength = map.get('handleLength');

    const trackStart = this.vertical() ? map.getIn(['track', 'top']) : map.getIn(['track', 'left']);
    const containerStart = this.vertical() ? map.getIn(['container', 'top']) : map.getIn(['container', 'left']);
    const trackPadding = trackStart - containerStart;
    const stepLength = map.get('stepLength');

    console.log(trackPadding);

    let range = map.getIn(['ranges', rangeIndex]);
    let rangePositionStart = 0 - (stepLength / 2);
    let rangePositionEnd = trackLength + (stepLength / 2);
    // Find start and end handle
    const fromHandleIndex = range.get('fromHandle');
    if (fromHandleIndex > -1) {
      const fromHandle = map.getIn(['handles', fromHandleIndex]);
      rangePositionStart = this.vertical() ? fromHandle.get('y') : fromHandle.get('x');
      if (range.get('includeHandles')) {
        rangePositionStart -= (handleLength / 2);
      } else {
        rangePositionStart += (handleLength / 2);
      }
    }
    let toHandleIndex = 0;
    if (fromHandleIndex >= 0) {
      toHandleIndex = fromHandleIndex + 1;
    }
    const toHandle = map.getIn(['handles', toHandleIndex]);
    if (toHandle) {
      rangePositionEnd = this.vertical() ? toHandle.get('y') : toHandle.get('x');
      if (range.get('includeHandles')) {
        rangePositionEnd += handleLength / 2;
      } else {
        rangePositionEnd -= handleLength / 2;
      }
    }
    const rangePosition = rangePositionStart + trackPadding;
    const rangeLength = rangePositionEnd - rangePositionStart;

    if (this.vertical()) {
      range = range.withMutations((st) => {
        st.set('left', 0)
          .set('top', rangePosition)
          .set('width', trackGauge)
          .set('height', rangeLength);
      });
    } else {
      range = range.withMutations((st) => {
        st.set('left', rangePosition)
          .set('top', 0)
          .set('width', rangeLength)
          .set('height', trackGauge);
      });
    }
    return range;
  }

  /**
   * @param index of the handle
   * @param eventX position of the mouse/touch event from window left
   * @param eventY position of the mouse/touch event from window top
   * @param deltaX distance from click event x to handle's left border
   * @param deltaY distance from click event y to handle's top border
   */
  updateMovingHandlePositionInState(index, eventX, eventY, deltaX, deltaY) {
    const containerStart = this.vertical() ? this.state.map.getIn(['container', 'top']) : this.state.map.getIn(['container', 'left']);
    const trackStart = this.vertical() ? this.state.map.getIn(['track', 'top']) : this.state.map.getIn(['track', 'left']);
    const handleLength = this.state.map.get('handleLength');
    const eventPos = this.vertical() ? eventY : eventX;
    const delta = this.vertical() ? deltaY : deltaX;

    const trackPadding = trackStart - containerStart;

    const handlePosition = (eventPos - delta - containerStart) + (handleLength / 2);
    let map = this.state.map.withMutations((mp) => {
      mp.set('isHandleMoving', true)
        .set('movingHandleIndex', index)
        .set('movingHandlePosition', handlePosition);
    });

    // Single handle position
    const handle = this.calculateHandlePosition(index, map);
    map = map.setIn(['handles', index], handle);

    // Range positions
    const ranges = map.get('ranges').map((range, i) => this.calculateRangePosition(i, map));
    map = map.set('ranges', ranges);
    // Is step in range?
    const steps = map.get('steps').map((step, i) => this.calculateIfStepInRange(i, map));
    map = map.set('steps', steps);
    this.triggerChange(map);

    this.setState({ map });
  }

  triggerChange(map) {
    // Build value for 3rd party code
    const handles = map.get('handles');
    const data = {};
    handles.map((handle, handleIndex) => {
      // Find matching step
      let matchingStep = null;
      map.get('steps').map((step) => {
        if (step.get('value') === handle.get('value')) {
          matchingStep = step;
        }
      });
      const key = handle.get('id') ? handle.get('id') : handle.get('index');
      data[key] = {
        value: handle.get('value'),
        step: {
        },
      };
      if (matchingStep) {
        data[key].step = {
          id: matchingStep.get('id'),
          index: matchingStep.get('index'),
        };
      }
    });
    if (this.props.onChange) {
      this.props.onChange(data);
      return;
    }
  }

  /**
   * Works for all Immutable.Map items in Immutable.List that have x and y as props
   * E.g. step, handle
   * @param Immutable.List of Immutable.Map objects with center  x and y coordinates
   */
  findClosest(list, position) {
    let closestItem = null;
    let closestDistance = -1;
    list.map((item, index) => {
      const itemPosition = this.vertical() ? item.get('y') : item.get('x');
      const distance = Math.abs(position - itemPosition);
      if (closestDistance < 0 || distance < closestDistance) {
        closestDistance = distance;
        closestItem = item;
      }
    });
    return closestItem;
  }

  vertical() {
    return this.props.orientation === 'vertical';
  }

  render() {
    const classNames = 'ReactMotionSliderInput ' +
      (this.vertical() ? 'vertical' : 'horizontal') +
      ((this.props.className) ? ' ' + this.props.className : '');
    return (
      <div className={classNames} ref='container'>
        <Track
          ref='track'
          orientation={this.vertical() ? 'vertical' : 'horizontal'}
          onClick={this.onTrackClick}
          handleLength={this.state.map.get('handleLength')}
        >
        {this.state.map.get('ranges').map((range, i) => {
          const key = `react-motion-input-slider-range-${i}`;
          return (
            <Range
              ref={`range-${i}`}
              index={i}
              key={key}
              label={range.get('label')}
              value={range.get('value')}
              left={range.get('left')}
              top={range.get('top')}
              width={range.get('width')}
              height={range.get('height')}
              className={range.get('className')}
              spring={this.config.spring}
              onClick={this.onRangeClick}
            />
          );
        })}

        {this.state.map.get('steps').map((step, i) => {
          if (step.get('isVisible') === false) return null;
          const key = `react-motion-input-slider-step-${i}`;
          return (
            <Step
              ref={`step-${i}`}
              index={i}
              key={key}
              label={step.get('label')}
              isVisible={step.get('isVisible')}
              value={step.get('value')}
              left={step.get('left')}
              top={step.get('top')}
              inRange={step.get('inRange')}
              className={step.get('className')}
              onClick={this.onStepClick}
            />
          );
        })}

        {this.state.map.get('handles').map((handle, i) => {
          const key = `react-motion-input-slider-handle-${i}`;
          return (
            <Handle
              ref={`handle-${i}`}
              index={i}
              key={key}
              left={handle.get('left')}
              top={handle.get('top')}
              onCatch={this.onHandleCatch}
              onMove={this.onHandleMove}
              onRelease={this.onHandleRelease}
              label={handle.get('label')}
              spring={this.config.spring}
            />
          );
        })}
      </Track>



      </div>
    );
  }
}
SliderInput.propTypes = {
  orientation: React.PropTypes.string,
  step: React.PropTypes.number,
  min: React.PropTypes.number,
  max: React.PropTypes.number,
  // shorthand for setting a single handle with a value
  value: React.PropTypes.oneOfType([
    React.PropTypes.string,
    React.PropTypes.number,
  ]),
  // Define steps manually
  steps: React.PropTypes.oneOfType([
    React.PropTypes.bool,
    React.PropTypes.arrayOf(React.PropTypes.shape({
      label: React.PropTypes.string,
      value: React.PropTypes.oneOfType([
        React.PropTypes.string,
        React.PropTypes.number,
      ]),
    })),
  ]),
  // Define handles manually (overrides 'value' shorthand if set)
  handles: React.PropTypes.arrayOf(React.PropTypes.shape({
    value: React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.number,
    ]).isRequired,
    id: React.PropTypes.string,
    label: React.PropTypes.string,
    className: React.PropTypes.string,
  })),
  // Define which ranges are visible between handles
  ranges: React.PropTypes.arrayOf(React.PropTypes.shape({
    id: React.PropTypes.string,
    label: React.PropTypes.string,
    fromHandle: React.PropTypes.number, // index of lower handle
    className: React.PropTypes.string,
    includeHandles: React.PropTypes.bool,
  })),
  // Shorthand for range config
  range: React.PropTypes.oneOfType([
    React.PropTypes.bool, // if true, set range below, false is noop
    React.PropTypes.string, // below or above
  ]),
  onChange: React.PropTypes.func,
  className: React.PropTypes.string,
  // React-motion spring config
  spring: React.PropTypes.shape({
    stiffness: React.PropTypes.number,
    damping: React.PropTypes.number,
    precision: React.PropTypes.number,
  }),
};
// export default Dimensions()(InputSlider);
export default SliderInput;
