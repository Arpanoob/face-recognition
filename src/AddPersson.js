import React, { useState, useRef, useEffect } from "react";
import * as facemesh from "@tensorflow-models/face-landmarks-detection";
import { Buffer } from "buffer";
import AWS from "aws-sdk";
import { drawMesh } from "./utilities";
import image from "./diaphragm.png";
import "./App.css";

const AddPerson = () => {
  const [uploadResultMessage, setUploadResultMessage] = useState(
    "Please Click Image Send ."
  );
  const [personName, setPersonName] = useState("");
  const [capturedImage, setCapturedImage] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  let faceDetectionInterval;

  useEffect(() => {
    AWS.config.update({
      accessKeyId:"AKIATCKAN3ZBHPQB3EV2",
      secretAccessKey: "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",
      region: "us-east-1",
    });
  }, []);

  const s3 = new AWS.S3();

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

    video.srcObject.getTracks().forEach((track) => track.stop());
    clearInterval(faceDetectionInterval);

    setCapturedImage(imageDataURL);
  };

  const removeImage = () => {
    setCapturedImage("");
    setIsCameraOpen(false);
  };

  const sendImage = async () => {
    if (!capturedImage || !personName) return;

    let base64Data;

    if (
      typeof capturedImage === "string" &&
      capturedImage.startsWith("data:image/jpeg;base64,")
    ) {
      base64Data = capturedImage.replace(/^data:image\/jpeg;base64,/, "");
    } else {
      base64Data = capturedImage.base64Data;
    }

    const buffer = Buffer.from(base64Data, "base64");
    const key = `index/${Date.now()}.jpg`;

    const params = {
      Bucket: "bucket-name-images",
      Key: key,
      Body: buffer,
      Metadata: {
        FullName: personName,
      },
    };

    setUploadResultMessage("Uploading...");

    s3.putObject(params, (err, data) => {
      if (err) {
        console.error("Error uploading image:", err);
        setUploadResultMessage("Upload failed");
      } else {
        console.log("Successfully uploaded image:", key);
        setUploadResultMessage("Uploaded");
      }
    });
  };

  return (
    <div className="App">
      <h1 className="heading">Facial Recognition System</h1>
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
          <React.Fragment>
            {!capturedImage && (
              <button className="action-button" onClick={captureImage}>
                Capture Image
              </button>
            )}
            {capturedImage && (
              <>
                <input
                  type="text"
                  placeholder="Enter Name"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                />
                <button className="remove-button" onClick={removeImage}>
                  Remove Picture
                </button>
                <button className="action-button" onClick={sendImage}>
                  Send
                </button>
              </>
            )}
          </React.Fragment>
        )}
      </div>
      <div className="success">{uploadResultMessage}</div>
    </div>
  );
};

export default AddPerson;
