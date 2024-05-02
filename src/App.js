import React, { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import image from "./diaphragm.png";
import "./App.css";

function App() {
  const [uploadResultMessage, setUploadResultMessage] = useState(
    "Please Click Image to Authenticate"
  );
  const [isAuth, setAuth] = useState(false);
  const [capturedImage, setCapturedImage] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      videoRef.current.srcObject = stream;
      setIsCameraOpen(true);
    } catch (error) {
      console.error("Error accessing the camera:", error);
    }
  };
  useEffect(() => {
  //  openCamera();

    return () => {
      // Cleanup code if needed
    };
  }, []);

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataURL = canvas.toDataURL("image/jpeg");
    setCapturedImage(imageDataURL);
  };

  const removeImage = () => {
    setCapturedImage("");
  };

  const sendImage = async () => {
    if (!capturedImage) return;

    const formData = new FormData();
    formData.append("image", capturedImage);

    try {
      const response = await fetch("YOUR_UPLOAD_ENDPOINT", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const isAuthenticated = await authenticate(data.visitorsImageName);

        if (isAuthenticated) {
          setUploadResultMessage(`Hi ${data.firstName}`);
          setAuth(true);
        } else {
          setUploadResultMessage("Authentication failed");
          setAuth(false);
        }
      } else {
        setUploadResultMessage("Failed to upload image");
        setAuth(false);
      }
    } catch (error) {
      console.error("Error sending image:", error);
      setUploadResultMessage("Error sending image");
      setAuth(false);
    }
  };

  const authenticate = async (visitorsImageName) => {
    try {
      const response = await fetch(
        `YOUR_AUTHENTICATION_ENDPOINT?objectKey=${visitorsImageName}.jpeg`
      );

      if (response.ok) {
        const data = await response.json();
        return data.Message === "Success";
      } else {
        console.error("Authentication failed");
        return false;
      }
    } catch (error) {
      console.error("Error authenticating:", error);
      return false;
    }
  };

  return (
    <div className="App">
      <h1 className="heading">Felix's Facial Recognition System</h1>
      <div className="camera-container">
        {" "}
        <video
          ref={videoRef}
          preload={image}
          className="camera"
          autoPlay
          muted
        ></video>
        {!isCameraOpen && (
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
          <React.Fragment>
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
          </React.Fragment>
        )}
      </div>
      <div className={isAuth ? "success" : "failure"}>
        {uploadResultMessage}
      </div>
    </div>
  );
}

export default App;
