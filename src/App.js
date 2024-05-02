import React, { useState, useRef, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import * as facemesh from "@tensorflow-models/face-landmarks-detection";
import { drawMesh } from "./utilities";
import image from "./diaphragm.png";
import "./App.css";

function App() {
  const [uploadResultMessage, setUploadResultMessage] = useState(
    "Please Click Image to Authenticate"
  );
  const canvasRef = useRef(null);

  // Load facemesh
  const [isAuth, setAuth] = useState(false);
  const [capturedImage, setCapturedImage] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  let faceDetectionInterval;

  const runFacemesh = async () => {
    const net = await facemesh.load(
      facemesh.SupportedPackages.mediapipeFacemesh
    );
    faceDetectionInterval = setInterval(() => {
      detect(net);
    }, 10);
  };

  const detect = async (net) => {
    if (
      typeof videoRef.current !== "undefined" &&
      videoRef.current !== null &&
      videoRef.current.readyState === 4
    ) {
      const video = videoRef.current;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      video.width = videoWidth;
      video.height = videoHeight;

      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const face = await net.estimateFaces({ input: video });
      console.log(face);

      const ctx = canvasRef.current.getContext("2d");
      requestAnimationFrame(() => {
        drawMesh(face, ctx);
      });
    }
  };

  useEffect(() => {
    runFacemesh();
    return () => {
      clearInterval(faceDetectionInterval);
    };
  }, []);

  const openCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
    } catch (error) {
      console.error("Error accessing the camera:", error);
    }
  };

  const captureImage = async () => {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataURL = canvas.toDataURL("image/jpeg");

    // Stop the video stream
    video.srcObject.getTracks().forEach((track) => track.stop());
    // Clear the interval for face detection
    clearInterval(faceDetectionInterval);

    setCapturedImage(imageDataURL);
  };

  const removeImage = () => {
    setCapturedImage("");
    setIsCameraOpen(false);
  };

  const sendImage = async () => {
    if (!capturedImage) return;

    setUploadResultMessage("Sending image for authentication...");

    // Dummy authentication logic for demonstration
    setTimeout(() => {
      setUploadResultMessage("Authentication successful!");
      setAuth(true);
    }, 2000);
  };

  return (
    <div className="App">
      <h1 className="heading">Facial Recognition System </h1>
      <div className="camera-container">
        {isCameraOpen && (
          <video
            ref={videoRef}
            preload={image}
            className="camera"
            autoPlay
            muted
          ></video>
        )}
        {isCameraOpen && (
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              marginLeft: "auto",
              marginRight: "auto",
              left: 0,
              right: 0,
              textAlign: "center",
              zIndex: 9, // Changed from zindex to zIndex
            }}
          />
        )}
        {!isCameraOpen && !capturedImage && (
          <img src={image} className="diaphragm" alt="Diaphragm" />
        )}
        {capturedImage && (
          <div className="image-preview">
            <img src={capturedImage} className="image" alt="Captured" />
          </div>
        )}
      </div>
      <div className="button-container">
        {!isCameraOpen && (
          <button className="action-button" onClick={openCamera}>
            Open Camera
          </button>
        )}
        {isCameraOpen && (
          <>
            {!capturedImage && (
              <button className="action-button" onClick={captureImage}>
                Capture Image
              </button>
            )}
            {capturedImage && (
              <>
                <button className="remove-button" onClick={removeImage}>
                  Remove Picture
                </button>
                <button
                  className="action-button"
                  onClick={sendImage}
                  disabled={!capturedImage}
                >
                  Authenticate
                </button>
              </>
            )}
          </>
        )}
      </div>
      <div className={isAuth ? "success" : "failure"}>
        {uploadResultMessage}
      </div>
    </div>
  );
}

export default App;
