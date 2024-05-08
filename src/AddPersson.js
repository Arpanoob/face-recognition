import React, { useState, useRef, useEffect } from "react";
import * as facemesh from "@tensorflow-models/face-landmarks-detection";
import { Buffer } from "buffer";
import AWS from "aws-sdk";
import { drawMesh } from "./utilities";
// Define the image variable here
import image from "./diaphragm.png";

const AddPerson = () => {
  const [uploadResultMessage, setUploadResultMessage] = useState(
    "Please Click Image Send ."
  );
  const canvasRef = useRef(null);

  console.log(
    process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
  );
  const [personName, setPersonName] = useState("");
  const [capturedImage, setCapturedImage] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  let faceDetectionInterval;

  useEffect(() => {
    AWS.config.update({
      accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
      secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
      region: "us-east-1",
    });
    runFacemesh();
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
    console.log(canvas);
    if (canvas !== null) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataURL = canvas.toDataURL("image/jpeg");

      video.srcObject.getTracks().forEach((track) => track.stop());
      clearInterval(faceDetectionInterval);

      setCapturedImage(imageDataURL);
    }
  };
  const runFacemesh = async () => {
    const net = await facemesh.load(
      facemesh.SupportedPackages.mediapipeFacemesh
    );
    faceDetectionInterval = setInterval(() => {
      detect(net);
    }, 10);
  };
  const removeImage = () => {
    setCapturedImage("");
    setIsCameraOpen(false);
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
      if (canvasRef.current !== null) {
        const ctx = canvasRef.current.getContext("2d");
        requestAnimationFrame(() => {
          drawMesh(face, ctx);
        });
      }
    }
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
        {
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              marginLeft: "auto",
              marginRight: "auto",
              left: 0,
              right: 0,
              textAlign: "center",
              zIndex: 9,
            }}
          />
        }
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
