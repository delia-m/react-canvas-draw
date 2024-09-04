import React, { Component } from "react";
import { render } from "react-dom";
import _ from 'lodash';

import CanvasDraw from "../../src";
import classNames from "./index.css";
import Marker from "./Marker";

const images = [
  "https://upload.wikimedia.org/wikipedia/commons/a/a1/Nepalese_Mhapuja_Mandala.jpg",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFWNiYAtw9Dbnt8XMwAs5UFxVJ-L2L4Kjt2Q&usqp=CAU",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR55DGM9JWtHeXFmopYScvXq2c9DATtf9O9Dg&usqp=CAU",
  "https://live.staticflickr.com/4561/38054606355_26429c884f_b.jpg",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSCGzDyCogLDj-A-4APBAjl-1cm7lKTW8xDOQ&usqp=CAU",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfJhWv8tsCcP2XdkRNdZeFYKIWmGWEg-Ma9Q&usqp=CAU",
];
class Demo extends Component {
  state = {
    color: "#ffc600",
    width: 400,
    height: 400,
    brushRadius: 10,
    lazyRadius: 12,
    hideInterface: true,
    randomImage: images[0],
    demoType: "marker",
  };

  intervalChangeImage = null;

  componentDidMount() {
    // let's change the color randomly every 2 seconds. fun!
    window.setInterval(() => {
      this.setState({
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
      });
    }, 2000);
  }

  setIntervalChangeImage = () => {
    this.intervalChangeImage = setTimeout(() => {
      const tempImages = _.filter(images, (n) => n !== this.state.randomImage);
      const nextImageIndex = Math.floor(Math.random() * tempImages.length);
      this.setState({ randomImage: tempImages[nextImageIndex] });
      this.intervalChangeImage = null;
    }, 3000);
  };

  render() {
    return (
      <div>
        <h1>React Canvas Draw</h1>
        <iframe
          title="GitHub link"
          src="https://ghbtns.com/github-btn.html?user=embiem&repo=react-canvas-draw&type=star&count=true"
          frameBorder="0"
          scrolling="0"
          width="160px"
          height="30px"
        />

        <button onClick={() => this.setState({ demoType: "draw" })}>
          DRAW DEMO
        </button>
        <button onClick={() => this.setState({ demoType: "marker" })}>
          MARKER DEMO
        </button>

        {this.state.demoType === "marker" ? (
          <Marker />
        ) : (
          <div>
            <h2>default</h2>
            <p>
              This is a simple <span>{`<CanvasDraw />`}</span> component with
              default values.
            </p>
            <p>Try it out! Draw on this white canvas:</p>
            <CanvasDraw onChange={() => console.log("onChange")} />
            <h2>Custom Brush-Color</h2>
            <p>
              Let's spice things up by using custom brush colors{" "}
              <span>{`<CanvasDraw brushColor={this.state.color} />`}</span>. We
              randomly change them every 2 seconds. But you could easily use a
              color-picker!
            </p>
            <div>
              Current color:{" "}
              <div
                style={{
                  display: "inline-block",
                  width: "24px",
                  height: "24px",
                  backgroundColor: this.state.color,
                  border: "1px solid #272727",
                }}
              />
            </div>
            <CanvasDraw brushColor={this.state.color} />

            <h2>Get local video stream from camera + snapshot</h2>
            <p>Base64 image will come in console when take a snapshot</p>
            <p>Resize canvas to video size</p>
            <p>canvas.snapshot() returns promise</p>
            <CanvasDraw
              ref={(canvasDraw) => (this.streamCanvas = canvasDraw)}
              brushColor="red"
              key={_.get(this.state.stream, "id")}
              videoStream={this.state.stream}
              onLoadMedia={({ width, height }) => {
                this.setState({ playbutton: true });
                if (this.streamCanvas.video) {
                  this.setState({
                    videoHeight: height,
                    videoWidth: width,
                  });
                }
              }}
              canvasHeight={this.state.videoHeight || 400}
              canvasWidth={this.state.videoWidth || 400}
            />
            <button
              onClick={() => {
                navigator.mediaDevices
                  .getUserMedia({ video: true, audio: true })
                  .then((stream) => {
                    this.setState({ stream });
                  });
              }}
            >
              Get camera video stream
            </button>
            <button
              onClick={() => {
                const includeBackground = true;
                const quality = 1;
                const bgOriginalSize = false;
                const { snapshot } = this.streamCanvas.snapshot(
                  includeBackground,
                  quality,
                  bgOriginalSize
                );
                console.log(snapshot);
                this.setState({ streamCanvasSnapshot: snapshot });
              }}
            >
              take a snapshot
            </button>
            <br />
            <img src={this.state.streamCanvasSnapshot} />

            <h2>Video player + snapshot</h2>
            <p>
              You can play video and draw on the top of it. play button will
              show up as it needs user's interaction to play
            </p>
            <p>Base64 image will come in console when take a snapshot</p>
            <p>Fixed canvas size (different to video size)</p>
            <CanvasDraw
              ref={(canvasDraw) => (this.videoCanvas = canvasDraw)}
              brushColor="red"
              videoSrc="http://upload.wikimedia.org/wikipedia/commons/7/79/Big_Buck_Bunny_small.ogv"
              onLoadMedia={({ width, height }) => {
                console.log({ width, height });
                this.setState({ playbutton: true });
                if (this.videoCanvas.video) {
                  // let width = this.videoCanvas.video.videoWidth;
                  // let height = this.videoCanvas.video.videoHeight;
                  if (width < 400 && height < 400) {
                    width = width * 2;
                    height = height * 2;
                  }
                  this.setState({
                    playerHeight: height,
                    playerWidth: width,
                  });
                }
              }}
              canvasHeight={this.state.playerHeight || 400}
              canvasWidth={this.state.playerWidth || 400}
            />
            {this.state.playbutton && (
              <button
                onClick={() => {
                  this.videoCanvas.playVideo();
                }}
              >
                play video
              </button>
            )}
            <button
              onClick={() => {
                const { snapshot } = this.videoCanvas.snapshot();
                console.log(snapshot);
                this.setState({ videoCanvasSnapshot: snapshot });
              }}
            >
              take a snapshot (canvas size)
            </button>
            <button
              onClick={() => {
                const { snapshot } = this.videoCanvas.snapshot(true, 1, true);
                console.log(snapshot);
                this.setState({ videoCanvasSnapshot: snapshot });
              }}
            >
              take a snapshot (original video size)
            </button>
            <br />
            <img src={this.state.videoCanvasSnapshot} />

            <h2>Background Image</h2>
            <p>
              You can also set the `imgSrc` prop to draw on a background-image.
            </p>
            <p>
              It will automatically resize to fit the canvas and centered
              vertically & horizontally.
            </p>
            <p>Base64 image will come in console when take a snapshot</p>
            <CanvasDraw
              ref={(canvasDraw) => (this.imageCanvas = canvasDraw)}
              brushColor="rgba(155,12,60,0.3)"
              imgSrc="https://upload.wikimedia.org/wikipedia/commons/a/a1/Nepalese_Mhapuja_Mandala.jpg"
              onLoadMedia={({ width, height }) => {
                console.log("image loaded:", { width, height });
              }}
            />
            <button
              onClick={() => {
                const { snapshot } = this.imageCanvas.snapshot();
                console.log(snapshot);
                this.setState({ imagesCanvasSnapshot: snapshot });
              }}
            >
              take a snapshot with image
            </button>
            <button
              onClick={() => {
                const { snapshot } = this.imageCanvas.snapshot(false);
                console.log(snapshot);
                this.setState({ imagesCanvasSnapshot: snapshot });
              }}
            >
              take a snapshot without image
            </button>
            <button
              onClick={() => {
                const { snapshot } = this.imageCanvas.snapshot(true, 1, true);
                console.log(snapshot);
                this.setState({ imagesCanvasSnapshot: snapshot });
              }}
            >
              take a snapshot (original image size)
            </button>
            <br />
            <img src={this.state.imagesCanvasSnapshot} />

            <h2>Multiple Background Image</h2>
            <CanvasDraw
              brushColor="rgba(155,12,60,0.3)"
              // key={this.state.randomImage}
              imgSrc={this.state.randomImage}
              onLoadMedia={({ width, height }) => {
                // console.log('[Multiple Background Image] image loaded:', { width, height });
                if (!this.intervalChangeImage) {
                  this.setIntervalChangeImage();
                }
              }}
            />

            <h2>Add text</h2>
            <p>1. Toggle to 'text' mode</p>
            <p>2. Type text into text input and 'enter'</p>
            <p>
              will draw text on canvas. You can move your text, undo last text
              if it's 'text' mode
            </p>
            <p>Back to brush mode on click 'blush mode'</p>
            <CanvasDraw
              ref={(canvasDraw) => (this.textCanvas = canvasDraw)}
              brushColor={"green"}
              disabled={this.state.mode === "text"}
              hideInterface={this.state.mode === "text"}
              mode={this.state.mode}
              imgSrc="https://upload.wikimedia.org/wikipedia/commons/a/a1/Nepalese_Mhapuja_Mandala.jpg"
              onChange={() => console.log("onChange")}
            />
            <p>current mode: {this.state.mode ? this.state.mode : "brush"}</p>
            <button onClick={() => this.setState({ mode: "brush" })}>
              blush mode
            </button>
            <button onClick={() => this.setState({ mode: "text" })}>
              add text
            </button>
            <button onClick={() => this.textCanvas.undo()}>Undo</button>
            <button onClick={() => this.textCanvas.clear()}>Claer</button>
            <button
              onClick={() => {
                const { snapshot } = this.textCanvas.snapshot();
                console.log(snapshot);
                this.setState({ textCanvasSnapshot: snapshot });
              }}
            >
              take a snapshot (canvas size)
            </button>
            <button
              onClick={() => {
                const { snapshot } = this.textCanvas.snapshot(true, 1, true);
                console.log(snapshot);
                this.setState({ textCanvasSnapshot: snapshot });
              }}
            >
              take a snapshot (original image size)
            </button>

            <br />
            <img src={this.state.textCanvasSnapshot} />

            <h2>Hide UI</h2>
            <p>
              To hide the UI elements, set the `hideInterface` prop. You can
              also hide the grid with the `hideGrid` prop.
            </p>
            <CanvasDraw hideInterface={this.state.hideInterface} hideGrid />
            <button
              onClick={() =>
                this.setState((prevState) => ({
                  hideInterface: !prevState.hideInterface,
                }))
              }
            >
              toggle interface
            </button>

            <br />

            <h2>Save & Load</h2>
            <p>Added Sync canvas live with right canvas</p>
            <p>
              This part got me most excited. Very easy to use saving and loading
              of drawings. It even comes with a customizable loading speed to
              control whether your drawing should load instantly (loadTimeOffset
              = 0) or appear after some time (loadTimeOffset > 0){" "}
              <span>{`<CanvasDraw loadTimeOffset={10} />`}</span>
            </p>
            <p>Try it out! Draw something, hit "Save" and then "Load".</p>
            <div className={classNames.tools}>
              <button
                onClick={() => {
                  localStorage.setItem(
                    "savedDrawing",
                    this.saveableCanvas.getSaveData()
                  );
                }}
              >
                Save
              </button>
              <button
                onClick={() => {
                  this.saveableCanvas.clear();
                }}
              >
                Clear
              </button>
              <button
                onClick={() => {
                  this.saveableCanvas.undo();
                }}
              >
                Undo
              </button>
              <div>
                <label>Width:</label>
                <input
                  type="number"
                  value={this.state.width + 100}
                  onChange={(e) =>
                    this.setState({ width: parseInt(e.target.value, 10) })
                  }
                />
              </div>
              <div>
                <label>Height:</label>
                <input
                  type="number"
                  value={this.state.height + 100}
                  onChange={(e) =>
                    this.setState({ height: parseInt(e.target.value, 10) })
                  }
                />
              </div>
              <div>
                <label>Brush-Radius:</label>
                <input
                  type="number"
                  value={this.state.brushRadius}
                  onChange={(e) =>
                    this.setState({ brushRadius: parseInt(e.target.value, 10) })
                  }
                />
              </div>
              <div>
                <label>Lazy-Radius:</label>
                <input
                  type="number"
                  value={this.state.lazyRadius}
                  onChange={(e) =>
                    this.setState({ lazyRadius: parseInt(e.target.value, 10) })
                  }
                />
              </div>
            </div>
            <div
              style={{
                width: 910,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <CanvasDraw
                ref={(canvasDraw) => (this.saveableCanvas = canvasDraw)}
                brushColor={this.state.color}
                textColor={this.state.color}
                textBgColor={"grey"}
                textBgPaddingVertical={20}
                textBgPaddingHorizontal={15}
                brushRadius={this.state.brushRadius}
                lazyRadius={this.state.lazyRadius}
                canvasWidth={this.state.width + 100}
                canvasHeight={this.state.height + 100}
                mode={this.state.mode}
                disabled={this.state.mode === "text"}
                hideInterface={this.state.mode === "text"}
                onSyncDataChange={(lastChange) => {
                  this.syncCanvas.syncData(lastChange);
                }}
                inputProps={{
                  top: 100,
                  fontFamily: "sans-serif",
                  fontSize: 50,
                }}
                userId={15}
              />
              <CanvasDraw
                hideGrid
                canvasWidth={this.state.width - 100}
                canvasHeight={this.state.height - 100}
                brushColor={this.state.color}
                ref={(canvasDraw) => (this.syncCanvas = canvasDraw)}
                onSyncDataChange={(lastChange) => {
                  this.saveableCanvas.syncData(lastChange);
                }}
                userId={10}
              />
            </div>
            <p>current mode: {this.state.mode ? this.state.mode : "brush"}</p>
            <button onClick={() => this.setState({ mode: "brush" })}>
              blush mode
            </button>
            <button onClick={() => this.setState({ mode: "text" })}>
              text mode
            </button>
            <button
              onClick={() => console.log(this.saveableCanvas.getSaveData())}
            >
              Get current data
            </button>
            <p>
              The following is a disabled canvas with a hidden grid that we use
              to load & show your saved drawing.
            </p>
            <button
              onClick={() => {
                this.loadableCanvas.loadSaveData(
                  localStorage.getItem("savedDrawing")
                );
              }}
            >
              Load what you saved previously into the following canvas. Either
              by calling `loadSaveData()` on the component's reference or
              passing it the `saveData` prop:
            </button>
            <CanvasDraw
              disabled
              hideGrid
              ref={(canvasDraw) => (this.loadableCanvas = canvasDraw)}
              saveData={localStorage.getItem("savedDrawing")}
            />
            <p>
              The saving & loading also takes different dimensions into account.
              Change the width & height, draw something and save it and then
              load it into the disabled canvas. It will load your previously
              saved masterpiece scaled to the current canvas dimensions.
            </p>
            <p>
              That's it for now! Take a look at the{" "}
              <a href="https://github.com/mBeierl/react-canvas-draw/tree/master/demo/src">
                source code of these examples
              </a>
              .
            </p>
          </div>
        )}
      </div>
    );
  }
}

render(<Demo />, document.querySelector("#demo"));
