import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import { LazyBrush } from "lazy-brush";
import { Catenary } from "catenary-curve";
import _ from 'lodash';

import ResizeObserver from "resize-observer-polyfill";

import drawImage from "./drawImage";

function midPointBtw(p1, p2) {
  return {
    x: p1.x + (p2.x - p1.x) / 2,
    y: p1.y + (p2.y - p1.y) / 2
  };
}

const canvasStyle = {
  display: "block",
  position: "absolute"
};

const canvasTypes = [
  {
    name: "interface",
    zIndex: 15
  },
  {
    name: "drawing",
    zIndex: 11
  },
  {
    name: "text",
    zIndex: 11
  },
  {
    name: "temp",
    zIndex: 14
  },
  {
    name: "grid",
    zIndex: 10
  },
  {
    name: "snapshot", // NOTE: video will be 9
    zIndex: 8
  },
];

const dimensionsPropTypes = PropTypes.oneOfType([
  PropTypes.number,
  PropTypes.string
]);

export default class extends PureComponent {
  static propTypes = {
    onChange: PropTypes.func,
    loadTimeOffset: PropTypes.number,
    lazyRadius: PropTypes.number,
    brushRadius: PropTypes.number,
    brushColor: PropTypes.string,
    catenaryColor: PropTypes.string,
    gridColor: PropTypes.string,
    backgroundColor: PropTypes.string,
    hideGrid: PropTypes.bool,
    canvasWidth: dimensionsPropTypes,
    canvasHeight: dimensionsPropTypes,
    disabled: PropTypes.bool,
    imgSrc: PropTypes.string,
    saveData: PropTypes.string,
    immediateLoading: PropTypes.bool,
    hideInterface: PropTypes.bool,
    videoSrc: PropTypes.string,
    videoStream: PropTypes.object,
    videoFps: PropTypes.number,
    videoProps: PropTypes.object,
    inputProps: PropTypes.object,
    onSyncDataChange: PropTypes.func,
  };

  static defaultProps = {
    onChange: null,
    loadTimeOffset: 5,
    lazyRadius: 12,
    brushRadius: 10,
    brushColor: "#444",
    catenaryColor: "#0a0302",
    gridColor: "rgba(150,150,150,0.17)",
    backgroundColor: "#FFF",
    hideGrid: false,
    canvasWidth: 400,
    canvasHeight: 400,
    disabled: false,
    imgSrc: "",
    saveData: "",
    immediateLoading: false,
    hideInterface: false,
    videoFps: 30,
    videoProps: {
      playsInline: true,
      autoPlay: true,
      controls: false,
    },
    inputProps: {},
    onSyncDataChange: null,
  };

  constructor(props) {
    super(props);

    this.canvas = {};
    this.ctx = {};

    this.catenary = new Catenary();

    this.points = [];
    this.lines = [];
    this.texts = [];

    this.mouseHasMoved = true;
    this.valuesChanged = true;
    this.isDrawing = false;
    this.isPressing = false;

    this.video = null;
    this.lastChange = null;
    this.state = {
      textinput: true,
      text: '',
      clickedPotision: { x: 10, y: 10 },
      selectedText: -1,
      startX: 0,
      startY: 0,
    };
  }

  componentDidMount() {
    this.lazy = new LazyBrush({
      radius: this.props.lazyRadius * window.devicePixelRatio,
      enabled: true,
      initialPoint: {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      }
    });
    this.chainLength = this.props.lazyRadius * window.devicePixelRatio;

    this.canvasObserver = new ResizeObserver((entries, observer) =>
      this.handleCanvasResize(entries, observer)
    );
    this.canvasObserver.observe(this.canvasContainer);

    this.drawImage();
    this.drawVideo();
    this.loop();

    window.setTimeout(() => {
      const initX = window.innerWidth / 2;
      const initY = window.innerHeight / 2;
      this.lazy.update(
        { x: initX - this.chainLength / 4, y: initY },
        { both: true }
      );
      this.lazy.update(
        { x: initX + this.chainLength / 4, y: initY },
        { both: false }
      );
      this.mouseHasMoved = true;
      this.valuesChanged = true;
      this.clear(false);

      // Load saveData from prop if it exists
      if (this.props.saveData) {
        this.loadSaveData(this.props.saveData);
      }
    }, 100);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.lazyRadius !== this.props.lazyRadius) {
      // Set new lazyRadius values
      this.chainLength = this.props.lazyRadius * window.devicePixelRatio;
      this.lazy.setRadius(this.props.lazyRadius * window.devicePixelRatio);
    }

    if (prevProps.saveData !== this.props.saveData) {
      this.loadSaveData(this.props.saveData);
    }

    if (JSON.stringify(prevProps) !== JSON.stringify(this.props)) {
      // Signal this.loop function that values changed
      this.valuesChanged = true;
    }

    if (!prevProps.videoStream && this.props.videoStream) {
      this.drawVideo();
    }
  }

  componentWillUnmount = () => {
    this.canvasObserver.unobserve(this.canvasContainer);
  };

  drawImage = () => {
    if (!this.props.imgSrc) return;

    // Load the image
    this.image = new Image();

    // Prevent SecurityError "Tainted canvases may not be exported." #70
    this.image.crossOrigin = "anonymous";

    // Draw the image once loaded
    this.image.onload = () => {
      drawImage({ ctx: this.ctx.grid, img: this.image });
    }

    this.image.src = this.props.imgSrc;
  };

  drawVideo = () => {
    if (this.video && this.props.videoStream) {
      if (this.video.srcObject !== this.props.videoStream) {
        this.video.srcObject = this.props.videoStream;
      }
    }
  }

  playVideo = () => {
    this.video.play();
  }

  undo = (mode = this.props.mode, triggerEvent = true) => {
    if (mode === 'text') {
      this.texts.pop();
      this.drawText();
      if (triggerEvent) {
        this.lastChange = { status: 'undo', mode };
        this.props.onSyncDataChange && this.props.onSyncDataChange(this.lastChange);
      }
      return;
    }

    const lines = this.lines.slice(0, -1);

    this.lines = [];
    this.valuesChanged = true;
    this.ctx.drawing.clearRect(
      0,
      0,
      this.canvas.drawing.width,
      this.canvas.drawing.height
    );
    this.ctx.temp.clearRect(
      0,
      0,
      this.canvas.temp.width,
      this.canvas.temp.height
    );

    this.simulateDrawingLines({ lines, immediate: true });
    if (triggerEvent) {
      this.triggerOnChange();
      this.lastChange = { status: 'undo', mode };
      this.props.onSyncDataChange && this.props.onSyncDataChange(this.lastChange);
    }
  };

  getSaveData = () => {
    // Construct and return the stringified saveData object
    return JSON.stringify({
      texts: this.texts,
      lines: this.lines,
      width: this.props.canvasWidth,
      height: this.props.canvasHeight,
    });
  };

  loadSaveData = (saveData, immediate = this.props.immediateLoading) => {
    if (typeof saveData !== "string") {
      throw new Error("saveData needs to be of type string!");
    }

    const { texts, lines, width, height } = JSON.parse(saveData);

    if (!lines || typeof lines.push !== "function") {
      throw new Error("saveData.lines needs to be an array!");
    }

    this.clear(false);

    if (
      width === this.props.canvasWidth &&
      height === this.props.canvasHeight
    ) {
      this.texts = texts;
      this.simulateDrawingLines({
        lines,
        immediate
      });
    } else {
      // we need to rescale the lines based on saved & current dimensions
      const scaleX = this.props.canvasWidth / width;
      const scaleY = this.props.canvasHeight / height;
      const scaleAvg = (scaleX + scaleY) / 2;

      if (!_.isEmpty(this.texts)) {
        this.texts = _.map(texts, t => ({
          ...t,
          x: t.x * scaleX,
          y: t.y * scaleY
        }));
      }

      this.simulateDrawingLines({
        lines: lines.map(line => ({
          ...line,
          points: line.points.map(p => ({
            x: p.x * scaleX,
            y: p.y * scaleY
          })),
          brushRadius: line.brushRadius * scaleAvg
        })),
        immediate
      });
    }
    this.drawText();
  };

  simulateDrawingLines = ({ lines, immediate }) => {
    // Simulate live-drawing of the loaded lines
    // TODO use a generator
    let curTime = 0;
    let timeoutGap = immediate ? 0 : this.props.loadTimeOffset;

    lines.forEach(line => {
      const { points, brushColor, brushRadius } = line;

      // Draw all at once if immediate flag is set, instead of using setTimeout
      if (immediate) {
        // Draw the points
        this.drawPoints({
          points,
          brushColor,
          brushRadius
        });

        // Save line with the drawn points
        this.points = points;
        this.saveLine({ brushColor, brushRadius });
        return;
      }

      // Use timeout to draw
      for (let i = 1; i < points.length; i++) {
        curTime += timeoutGap;
        window.setTimeout(() => {
          this.drawPoints({
            points: points.slice(0, i + 1),
            brushColor,
            brushRadius
          });
        }, curTime);
      }

      curTime += timeoutGap;
      window.setTimeout(() => {
        // Save this line with its props instead of this.props
        this.points = points;
        this.saveLine({ brushColor, brushRadius });
      }, curTime);
    });
  };

  handleDrawStart = e => {
    e.preventDefault();

    // Start drawing
    this.isPressing = true;

    const { x, y } = this.getPointerPos(e);

    if (this.props.mode === 'text') {
      this.setState({ startX: x, startY: y });

      let selected = false;
      // Put your mousedown stuff here
      for (var i = 0; i < this.texts.length; i++) {
        if (this.textHittest(x, y, i)) {
          selected = true;
          this.setState({ selectedText: i });
        }
      }
      if (!selected) {
        if (this.inputtext) {
          this.setState({ clickedPotision: { x, y } });
          this.inputtext.focus();
        }
      }
    }

    if (e.touches && e.touches.length > 0) {
      // on touch, set catenary position to touch pos
      this.lazy.update({ x, y }, { both: true });
    }

    // Ensure the initial down position gets added to our line
    this.handlePointerMove(x, y);
  };

  handleDrawMove = e => {
    if (this.props.mode === 'text') {
      this.handleTextMode(e);
    }

    e.preventDefault();

    const { x, y } = this.getPointerPos(e);
    this.handlePointerMove(x, y);
  };

  handleDrawEnd = e => {
    e.preventDefault();

    // Draw to this end pos
    this.handleDrawMove(e);
    
    // Stop drawing & save the drawn line
    this.isDrawing = false;
    this.isPressing = false;

    const pointsToSend = [...this.points];
    this.saveLine();
        
    if (this.props.mode === 'text') {
      this.setState({ selectedText: -1 });
    }

    if (!_.isEmpty(pointsToSend)) {
      this.props.onSyncDataChange && this.props.onSyncDataChange({
        isDrawing: false,
        points: pointsToSend,
        brushColor: this.props.brushColor,
        brushRadius: this.props.brushRadius,
      });
    }
  };

  textHittest = (x, y, textIndex) => {
    var text = this.texts[textIndex];
    return (x >= text.x && x <= text.x + text.width && y >= text.y - text.height && y <= text.y);
  };

  handleCanvasResize = (entries, observer) => {
    const saveData = this.getSaveData();
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      this.setCanvasSize(this.canvas.interface, width, height);
      this.setCanvasSize(this.canvas.drawing, width, height);
      this.setCanvasSize(this.canvas.temp, width, height);
      this.setCanvasSize(this.canvas.grid, width, height);
      this.setCanvasSize(this.canvas.text, width, height);
      this.setCanvasSize(this.canvas.snapshot, width, height);
      if (this.video) {
        this.setCanvasSize(this.video, width, height);
      }

      this.drawGrid(this.ctx.grid);
      this.drawImage();
      this.loop({ once: true });
    }
    this.loadSaveData(saveData, true);
  };

  setCanvasSize = (canvas, width, height) => {
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width;
    canvas.style.height = height;
  };

  getPointerPos = e => {
    const rect = this.canvas.interface.getBoundingClientRect();

    // use cursor pos as default
    let clientX = e.clientX;
    let clientY = e.clientY;

    // use first touch if available
    if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    // return mouse/touch position inside canvas
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  handlePointerMove = (x, y) => {
    if (this.props.disabled) return;

    this.lazy.update({ x, y });
    const isDisabled = !this.lazy.isEnabled();

    if (
      (this.isPressing && !this.isDrawing) ||
      (isDisabled && this.isPressing)
    ) {
      // Start drawing and add point
      this.isDrawing = true;
      this.points.push(this.lazy.brush.toObject());
    }

    if (this.isDrawing) {
      // Add new point
      this.points.push(this.lazy.brush.toObject());

      // Draw current points
      this.drawPoints({
        points: this.points,
        brushColor: this.props.brushColor,
        brushRadius: this.props.brushRadius
      });
    }

    this.mouseHasMoved = true;

    if (this.isDrawing) {
      this.lastChange = {
        isDrawing: this.isDrawing,
        points: this.points,
        brushColor: this.props.brushColor,
        brushRadius: this.props.brushRadius
      };
      this.props.onSyncDataChange && this.props.onSyncDataChange(this.lastChange);
    }
  };

  drawPoints = ({ points, brushColor, brushRadius }) => {
    this.ctx.temp.lineJoin = "round";
    this.ctx.temp.lineCap = "round";
    this.ctx.temp.strokeStyle = brushColor;

    this.ctx.temp.clearRect(
      0,
      0,
      this.ctx.temp.canvas.width,
      this.ctx.temp.canvas.height
    );
    this.ctx.temp.lineWidth = brushRadius * 2;

    let p1 = points[0];
    let p2 = points[1];

    this.ctx.temp.moveTo(p2.x, p2.y);
    this.ctx.temp.beginPath();

    for (var i = 1, len = points.length; i < len; i++) {
      // we pick the point between pi+1 & pi+2 as the
      // end point and p1 as our control point
      var midPoint = midPointBtw(p1, p2);
      this.ctx.temp.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
      p1 = points[i];
      p2 = points[i + 1];
    }
    // Draw last line as a straight line while
    // we wait for the next point to be able to calculate
    // the bezier control point
    this.ctx.temp.lineTo(p1.x, p1.y);
    this.ctx.temp.stroke();
  };


  getLastChange = () => {
    return this.lastChange;
  };

  syncData = (lastChange) => {
    if (_.isEmpty(lastChange)) {
      return;
    }

    if (lastChange.status === 'clear') {
      return this.clear(false);
    }

    if (lastChange.status === 'undo') {
      this.undo(lastChange.mode, false);
      return;
    }

    if (_.has(lastChange, 'text')) {
      if (lastChange.status === 'new') {
        this.texts.push(lastChange.text);
      } else if (lastChange.status === 'move') {
        this.texts[lastChange.index] = lastChange.text;
      }
      this.drawText();
    } else if (_.has(lastChange, 'points')) {
      const { points, brushColor, brushRadius } = lastChange;
      if (!_.isEmpty(points)) {
        this.points = points;
        // Draw current points
        this.drawPoints({ points, brushColor, brushRadius });
      }

      if (lastChange.isDrawing === false) {
        this.isDrawing = false;
        this.isPressing = false;
        this.saveLine({ brushColor, brushRadius }, false);
      }
    }
  };

  saveLine = ({ brushColor, brushRadius } = {}, triggerEvent = true) => {
    if (this.points.length < 2) return;

    // Save as new line
    this.lines.push({
      points: [...this.points],
      brushColor: brushColor || this.props.brushColor,
      brushRadius: brushRadius || this.props.brushRadius
    });

    // Reset points array
    this.points.length = 0;
    
    const width = this.canvas.temp.width;
    const height = this.canvas.temp.height;
    
    // Copy the line to the drawing canvas
    this.ctx.drawing.drawImage(this.canvas.temp, 0, 0, width, height);
    
    // Clear the temporary line-drawing canvas
    this.ctx.temp.clearRect(0, 0, width, height);
    
    if (triggerEvent) {
      this.triggerOnChange();
    }
  };

  triggerOnChange = () => {
    this.props.onChange && this.props.onChange(this);
  };

  clear = (triggerEvent = true) => {
    this.texts = [];
    this.lines = [];
    this.valuesChanged = true;
    this.ctx.drawing.clearRect(
      0,
      0,
      this.canvas.drawing.width,
      this.canvas.drawing.height
    );
    this.ctx.temp.clearRect(
      0,
      0,
      this.canvas.temp.width,
      this.canvas.temp.height
    );
    this.ctx.text.clearRect(
      0,
      0,
      this.canvas.text.width,
      this.canvas.text.height
    );
    if (triggerEvent) {
      this.props.onSyncDataChange && this.props.onSyncDataChange({ status: 'clear' });
    }
  };

  loop = ({ once = false } = {}) => {
    if (this.mouseHasMoved || this.valuesChanged) {
      const pointer = this.lazy.getPointerCoordinates();
      const brush = this.lazy.getBrushCoordinates();

      this.drawInterface(this.ctx.interface, pointer, brush);
      this.mouseHasMoved = false;
      this.valuesChanged = false;
    }

    if (!once) {
      window.requestAnimationFrame(() => {
        this.loop();
      });
    }
  };

  drawGrid = ctx => {
    if (this.props.hideGrid) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.beginPath();
    ctx.setLineDash([5, 1]);
    ctx.setLineDash([]);
    ctx.strokeStyle = this.props.gridColor;
    ctx.lineWidth = 0.5;

    const gridSize = 25;

    let countX = 0;
    while (countX < ctx.canvas.width) {
      countX += gridSize;
      ctx.moveTo(countX, 0);
      ctx.lineTo(countX, ctx.canvas.height);
    }
    ctx.stroke();

    let countY = 0;
    while (countY < ctx.canvas.height) {
      countY += gridSize;
      ctx.moveTo(0, countY);
      ctx.lineTo(ctx.canvas.width, countY);
    }
    ctx.stroke();
  };

  drawInterface = (ctx, pointer, brush) => {
    if (this.props.hideInterface) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw brush preview
    ctx.beginPath();
    ctx.fillStyle = this.props.brushColor;
    ctx.arc(brush.x, brush.y, this.props.brushRadius, 0, Math.PI * 2, true);
    ctx.fill();

    // Draw mouse point (the one directly at the cursor)
    ctx.beginPath();
    ctx.fillStyle = this.props.catenaryColor;
    ctx.arc(pointer.x, pointer.y, 4, 0, Math.PI * 2, true);
    ctx.fill();

    // Draw catenary
    if (this.lazy.isEnabled()) {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = this.props.catenaryColor;
      this.catenary.drawToCanvas(
        this.ctx.interface,
        brush,
        pointer,
        this.chainLength
      );
      ctx.stroke();
    }

    // Draw brush point (the one in the middle of the brush preview)
    ctx.beginPath();
    ctx.fillStyle = this.props.catenaryColor;
    ctx.arc(brush.x, brush.y, 2, 0, Math.PI * 2, true);
    ctx.fill();
  };

  snapshot = (includeImage = true, quality = 1) => {
    const width = this.canvas.grid.width;
    const height = this.canvas.grid.height;

    this.ctx.snapshot.fillStyle = "#fff";
    this.ctx.snapshot.fillRect(0, 0, width, height);

    if (includeImage) {
      if (this.video) {
        // take video snapshot into background
        // NOTE: video will be stretched if it's smaller than canvas
        // copy video to snapshot canvas
        this.ctx.snapshot.drawImage(this.video, 0, 0, width, height);
      } else if (this.image) {
        drawImage({ ctx: this.ctx.snapshot, img: this.image });
      }
    }
    this.ctx.snapshot.drawImage(this.canvas.drawing, 0, 0, width, height);
    this.ctx.snapshot.drawImage(this.canvas.text, 0, 0, width, height);
    this.ctx.snapshot.drawImage(this.canvas.temp, 0, 0, width, height);
    // take a snapshot with image
    return this.canvas.snapshot.toDataURL("image/jpeg", quality); // data:base64
  };

  handleTextMode = (e) => {
    if (this.state.selectedText < 0) {
      return;
    }

    e.preventDefault();
    const { x, y } = this.getPointerPos(e);

    // Put your mousemove stuff here
    var dx = x - this.state.startX;
    var dy = y - this.state.startY;
    this.setState({ startX: x, startY: y });

    var text = this.texts[this.state.selectedText];
    text.x += dx;
    text.y += dy;
    this.drawText();

    this.lastChange = { status: 'move', index: this.state.selectedText, text };
    this.props.onSyncDataChange && this.props.onSyncDataChange(this.lastChange);
  };

  drawText = (canvas = 'text') => {
    this.ctx[canvas].font = "15px verdana";
    this.ctx[canvas].clearRect(0, 0, this.canvas[canvas].width, this.canvas[canvas].height);
    for (var i = 0; i < this.texts.length; i++) {
      var text = this.texts[i];
      this.ctx[canvas].fillText(text.text, text.x, text.y);
    }
  }

  onFinishEditText = () => {
    if (_.isEmpty(_.trim(this.state.text))) {
      return;
    }

    const text = {
      text: this.state.text,
      x: this.state.clickedPotision.x,
      y: this.state.clickedPotision.y + 15
    };
    this.ctx.temp.font = "15px verdana";
    text.width = this.ctx.temp.measureText(text.text).width;
    text.height = 16;

    // put this new text in the texts array
    this.texts.push(text);
    this.drawText();
    
    let nextInputX = text.x;
    let nextInputY = Math.min(text.y + 16, this.canvas.temp.height - 30);
    if (text.y + 16 > this.canvas.temp.height - 30) {
      nextInputX = nextInputX + 50;
      nextInputY = 10;
    }
    this.setState({ text: '', clickedPotision: { x: nextInputX, y: nextInputY } });

    this.lastChange = { status: 'new', text: _.last(this.texts) };
    this.props.onSyncDataChange && this.props.onSyncDataChange(this.lastChange);
  }

  render() {
    return (
      <div
        className={this.props.className}
        style={{
          display: "block",
          background: this.props.backgroundColor,
          touchAction: "none",
          width: this.props.canvasWidth,
          height: this.props.canvasHeight,
          position: 'relative',
          ...this.props.style
        }}
        ref={container => {
          if (container) {
            this.canvasContainer = container;
          }
        }}
      >
        {(this.props.videoSrc || this.props.videoStream) && (
          <video
            ref={(video) => this.video = video}
            style={{ ...canvasStyle, backgroundColor: '#fff', zIndex: 9 }}
            onLoadedData={() => {
              console.log("loaded canvas video data");
              if (this.props.onloaddata) {
                this.props.onloaddata();
              }
              this.video.play();
            }}
            rel="noopener noreferrer"
            crossOrigin="Anonymous"
            {...this.props.videoProps}
          >
            <source rel="noopener noreferrer" src={this.props.videoSrc} crossOrigin="Anonymous" />
          </video>
        )}
        {canvasTypes.map(({ name, zIndex }) => {
          const isInterface = name === "interface";
          return (
            <canvas
              key={name}
              ref={canvas => {
                if (canvas) {
                  this.canvas[name] = canvas;
                  this.ctx[name] = canvas.getContext("2d");
                }
              }}
              style={{ ...canvasStyle, zIndex }}
              onMouseDown={isInterface ? this.handleDrawStart : undefined}
              onMouseMove={isInterface ? this.handleDrawMove : undefined}
              onMouseUp={isInterface ? this.handleDrawEnd : undefined}
              onMouseOut={isInterface ? this.handleDrawEnd : undefined}
              onTouchStart={isInterface ? this.handleDrawStart : undefined}
              onTouchMove={isInterface ? this.handleDrawMove : undefined}
              onTouchEnd={isInterface ? this.handleDrawEnd : undefined}
              onTouchCancel={isInterface ? this.handleDrawEnd : undefined}
            />
          );
        })}

        {this.props.mode === 'text' && this.state.textinput && (
          <input
            ref={(input) => this.inputtext = input}
            type="text"
            autoFocus
            style={{
              backgroundColor: 'transparent',
              border: `1px #ddd solid`,
              padding: 5,
              ...this.props.inputProps,
              position: 'absolute',
              zIndex: 20, // should be on the top of all canvas
              transform: `translateX(${this.state.clickedPotision.x}px) translateY(${this.state.clickedPotision.y}px)`
            }}
            value={this.state.text}
            onChange={(event) => {
              this.setState({ text: event.target.value });
            }}
            onBlur={this.onFinishEditText}
            onKeyDown={(e) => {
              if (e.keyCode === 13) {
                this.onFinishEditText();
              }
            }}
          />
        )}
      </div>
    );
  }
}
