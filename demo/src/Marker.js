import React from "react";
import _ from "lodash";

import CanvasDraw from "../../src";

export default function (props) {
  const [mode, setMode] = React.useState("brush");
  const [markers, setMarkers] = React.useState([]);
  const [snapshotImage, setSnapshotImage] = React.useState();

  const markersCanvasRef = React.useRef();

  const defaultMarkers = [
    {
      id: "pass",
      bgColor: "#0f0",
      textColor: "#000",
      borderColor: "#000",
      text: "1",
      label: "PASS",
    },
    {
      id: "issue",
      bgColor: "#ff0",
      textColor: "#000",
      borderColor: "#000",
      text: "1",
      label: "ISSUE",
    },
    {
      id: "fail",
      bgColor: "#f00",
      textColor: "#fff",
      borderColor: "#000",
      text: "1",
      label: "FAIL",
    },
    {
      id: "info",
      bgColor: "#00f",
      textColor: "#fff",
      borderColor: "#000",
      text: "1",
      label: "INFO",
    },
  ];

  return (
    <div>
      <p />
      <h1>Editable makers</h1>
      <button onClick={() => setMode("brush")}>Brush Mode</button>
      <button onClick={() => setMode("marker")}>Markers Mode</button>
      <button
        onClick={() => {
          if (markers.length < defaultMarkers.length) {
            setMarkers(_.concat(markers, defaultMarkers[markers.length]));
          }
        }}
      >
        Add marker
      </button>
      <button
        onClick={() => {
          markersCanvasRef.current.clear();
        }}
      >
        Clear
      </button>
      <button
        onClick={() => {
          markersCanvasRef.current.undo();
        }}
      >
        Undo
      </button>
      <div
        style={{
          width: 910,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <CanvasDraw
          key="canvasMarkers"
          ref={markersCanvasRef}
          markers={markers}
          disabled={mode !== "brush"}
          hideInterface={mode !== "brush"}
          mode={mode}
        />
      </div>
      <p />
      <button
        onClick={() => {
          const { snapshot } = markersCanvasRef.current.snapshot(false);
          setSnapshotImage(snapshot);
        }}
      >
        take a snapshot (original image size)
      </button>
      <p />
      <img src={snapshotImage} alt="snapshot" />
    </div>
  );
}
