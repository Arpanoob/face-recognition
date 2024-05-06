import React, { useState, useRef, useEffect } from "react";
import { BrowserRouter as Router, useNavigate } from "react-router-dom";
import * as tf from "@tensorflow/tfjs";
import * as facemesh from "@tensorflow-models/face-landmarks-detection";
import { drawMesh } from "./utilities";
import AddPerson from "./AddPersson";
import AWS from "aws-sdk";
import image from "./diaphragm.png";
import "./App.css";

const Home = () => {
  const [isAuth, setAuth] = useState(false);
  const [uploadResultMessage, setUploadResultMessage] = useState(
    "Please Click Image to Authenticate"
  );
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const Navigate = useNavigate();
  const rekognition = new AWS.Rekognition({ region: "us-east-1" });

  const dynamodb = new AWS.DynamoDB({ region: "us-east-1" });

  useEffect(() => {
    AWS.config.update({
      accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY_ID,
      region: process.env.REACT_APP_AWS_REGION,
    });
    runFacemesh();

    return () => clearInterval(faceDetectionInterval);
  }, []);

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

      const ctx = canvasRef.current.getContext("2d");
      requestAnimationFrame(() => {
        drawMesh(face, ctx);
      });
    }
  };

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
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (blob) {
          const imageBinary = await getImageBinary(blob);
          await searchFacesByImage(imageBinary);
        } else {
          console.error(
            "Error capturing image: Unable to convert canvas to Blob"
          );
        }
      }, "image/jpeg");
    } catch (error) {
      console.error("Error capturing image:", error);
      setUploadResultMessage("Error capturing image: " + error.message);
      setAuth(false);
    }
  };

  const getImageBinary = async (imageBlob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        resolve(uint8Array);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(imageBlob);
    });
  };

  const searchFacesByImage = async (imageBinary) => {
    console.log("Sending image to AWS Rekognition...");
    setUploadResultMessage("Sending image to AWS Rekognition...");
    try {
      const rekognition = new AWS.Rekognition({ region: "us-east-1" });
      const response = await rekognition
        .searchFacesByImage({
          CollectionId: "im",
          Image: { Bytes: imageBinary },
        })
        .promise();

      if (response.FaceMatches && response.FaceMatches.length > 0) {
        const face = await dynamodb
          .getItem({
            TableName: "face_recognition",
            Key: {
              RekognitionId: { S: response.FaceMatches[0].Face.FaceId },
            },
          })
          .promise();
        if (face.Item) {
          console.log("Found Person:", face.Item.FullName.S);
          setUploadResultMessage(face.Item.FullName.S);
        }
        setAuth(true);
      } else {
        console.log("No faces found in the image.");
        setUploadResultMessage("No faces found in the image.");
        setAuth(false);
      }
    } catch (error) {
      console.error("Error searching faces by image:", error);
      setUploadResultMessage("Error: " + error.message);
      setAuth(false);
    }
  };

  const removeImage = () => {
    setIsCameraOpen(false);
  };

  const sendImage = async () => {
    await captureImage();
  };

  const navigateToAddPage = () => {
    Navigate("/add");
  };

  return (
    <div className="App">
      <button className="action-button" onClick={navigateToAddPage}>
        Add
      </button>
      <h1 className="heading">Facial Recognition System</h1>
      <div className="camera-container">
        {isCameraOpen && (
          <video ref={videoRef} className="camera" autoPlay muted></video>
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
              zIndex: 9,
            }}
          />
        )}
        {!isCameraOpen && (
          <img src={image} className="diaphragm" alt="Diaphragm" />
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
            <button className="action-button" onClick={captureImage}>
              Capture Image
            </button>
          </>
        )}
      </div>
      <div className={isAuth ? "success" : "failure"}>
        {uploadResultMessage}
      </div>
    </div>
  );
};

export default Home;
