import React from "react";
import { render } from "react-dom";
import _ from "lodash";

import CanvasDraw from "../../src";
import classNames from "./index.css";

export default function (props) {
  const [markers, setMarkers] = React.useState([]);

  const saveableCanvasRef = React.useRef();
  const loadableCanvasRef = React.useRef();

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
      <button
        onClick={() => {
          if (markers.length < defaultMarkers.length) {
            setMarkers(_.concat(markers, defaultMarkers[markers.length]));
          }
        }}
      >
        Add marker
      </button>
      <CanvasDraw
        key="canvasMarkers"
        ref={saveableCanvasRef}
        markers={markers}
        saveData={localStorage.getItem("savedDrawingMarker")}
      />

      <p />
      <button
        onClick={() => {
          localStorage.setItem(
            "savedDrawingMarker",
            saveableCanvasRef.current.getSaveData()
          );
        }}
      >
        Save
      </button>
      <button
        onClick={() => {
          saveableCanvasRef.current.clear();
        }}
      >
        Clear
      </button>
      <button
        onClick={() => {
          saveableCanvasRef.current.undo();
        }}
      >
        Undo
      </button>
      <CanvasDraw ref={loadableCanvasRef} key="canvasToCopyMarkers" />
    </div>
  );
}
