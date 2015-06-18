//------------------------------------------------------------------------------
//// THIS CODE AND INFORMATION IS PROVIDED "AS IS" WITHOUT WARRANTY OF 
//// ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO 
//// THE IMPLIED WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A 
//// PARTICULAR PURPOSE. 
//// 
//// Copyright (c) Microsoft Corporation. All rights reserved. 
//------------------------------------------------------------------------------

(function () {
    "use strict";

    var kinect = WindowsPreview.Kinect;

    // C++ WinRT component
    var bodyImageProcessor = KinectImageProcessor.BodyHelper;

    // active sensor
    var kinectSensor = null;

    // references to canvas
    var bodyCanvas = null;
    var bodyContext = null;

    // reader for body frames
    var bodyFrameReader = null;

    var bodies = null;

    // array of all bones in a body
    // each bone is defined by two joints
    var bones = null;

    // defines a different color for each body
    var bodyColors = null;

    // total number of joints = 25
    var jointCount = null;

    // total number of bones = 24
    var boneCount = null;

    // handstate circle size
    var HANDSIZE = 20;

    // tracked bone line thickness
    var TRACKEDBONETHICKNESS = 4;

    // inferred bone line thickness
    var INFERREDBONETHICKNESS = 1;

    // thickness of joints
    var JOINTTHICKNESS = 3;

    // thickness of clipped edges
    var CLIPBOUNDSTHICKNESS = 5;

    // closed hand state color
    var HANDCLOSEDCOLOR = "red";

    // open hand state color
    var HANDOPENCOLOR = "green";

    // lasso hand state color
    var HANDLASSOCOLOR = "blue";

    // tracked joint color
    var TRACKEDJOINTCOLOR = "green";

    // inferred joint color
    var INFERREDJOINTCOLOR = "yellow";

    WinJS.Namespace.define("KinectBodyView", {
        BodyView: WinJS.Class.define(

            // Constructor for initializing the KinectBodyView class.
            function (kinectSensor) {
                if (kinectSensor == null) {
                    throw 'kinectSensor cannot be null';
                }

                this.kinectSensor = kinectSensor;
                this.bodies = new Array(this.kinectSensor.bodyFrameSource.bodyCount);

                // get depth frame description
                var depthFrameDescription = this.kinectSensor.depthFrameSource.frameDescription;

                // create bones
                bones = this.populateBones();

                // set number of joints and bones
                jointCount = kinect.Body.jointCount;
                boneCount = bones.length;

                // get canvas objects
                bodyCanvas = document.getElementById("mainCanvas");
                bodyCanvas.width = depthFrameDescription.width;;
                bodyCanvas.height = depthFrameDescription.height;;
                bodyContext = bodyCanvas.getContext("2d");

                // set body colors for each unique body
                bodyColors = [
                    "red",
                    "orange",
                    "green",
                    "blue",
                    "indigo",
                    "violet"
                ];
            },

            // Detector class properties and functions.
            {
                UpdateBodyFrame: function (kinectSensor) {
                    if (kinectSensor == null) {
                        throw 'kinect sensor cannot be null';
                    }

                    if (this.bodies != null) {
                        // clear canvas before drawing each frame
                        bodyContext.clearRect(0, 0, bodyCanvas.width, bodyCanvas.height);

                        // iterate through each body
                        for (var index = 0; index < this.bodies.length; ++index) {
                            var body = this.bodies[index];

                            // look for tracked bodies
                            if (body.isTracked) {
                                // get joints collection
                                var joints = body.joints;
                                // allocate space for storing joint locations
                                var jointPoints = this.createJointPoints();

                                // call native component to map all joint locations to depth space
                                if (bodyImageProcessor.processJointLocations(joints, jointPoints)) {
                                    // draw the body
                                    this.drawBody(joints, jointPoints, bodyColors[index]);

                                    // draw handstate circles
                                    this.updateHandState(body.handLeftState, jointPoints[kinect.JointType.handLeft]);
                                    this.updateHandState(body.handRightState, jointPoints[kinect.JointType.handRight]);

                                    // draw clipped edges if any
                                    this.drawClippedEdges(body);
                                }
                            }
                        }
                    }
                },

                // Draw a joint circle on canvas
                drawJoint: function (joint, jointColor) {
                    bodyContext.beginPath();
                    bodyContext.fillStyle = jointColor;
                    bodyContext.arc(joint.x, joint.y, JOINTTHICKNESS, 0, Math.PI * 2, true);
                    bodyContext.fill();
                    bodyContext.closePath();
                },

                // Draw a bone line on canvas
                drawBone: function (startPoint, endPoint, boneThickness, boneColor) {
                    bodyContext.beginPath();
                    bodyContext.strokeStyle = boneColor;
                    bodyContext.lineWidth = boneThickness;
                    bodyContext.moveTo(startPoint.x, startPoint.y);
                    bodyContext.lineTo(endPoint.x, endPoint.y);
                    bodyContext.stroke();
                    bodyContext.closePath();
                },

                // Determine hand state
                updateHandState: function (handState, jointPoint) {
                    switch (handState) {
                        case kinect.HandState.closed:
                            this.drawHand(jointPoint, HANDCLOSEDCOLOR);
                            break;

                        case kinect.HandState.open:
                            this.drawHand(jointPoint, HANDOPENCOLOR);
                            break;

                        case kinect.HandState.lasso:
                            this.drawHand(jointPoint, HANDLASSOCOLOR);
                            break;
                    }
                },

                // Draw a body
                drawBody: function (joints, jointPoints, bodyColor) {
                    // draw all bones
                    for (var boneIndex = 0; boneIndex < boneCount; ++boneIndex) {
                        var boneStart = bones[boneIndex].jointStart;
                        var boneEnd = bones[boneIndex].jointEnd;

                        var joint0 = joints.lookup(boneStart);
                        var joint1 = joints.lookup(boneEnd);

                        // don't do anything if either joint is not tracked
                        if ((joint0.trackingState == kinect.TrackingState.notTracked) ||
                            (joint1.trackingState == kinect.TrackingState.notTracked)) {
                            return;
                        }

                        // all bone lines are inferred thickness unless both joints are tracked
                        var boneThickness = INFERREDBONETHICKNESS;
                        if ((joint0.trackingState == kinect.TrackingState.tracked) &&
                            (joint1.trackingState == kinect.TrackingState.tracked)) {
                            boneThickness = TRACKEDBONETHICKNESS;
                        }

                        this.drawBone(jointPoints[boneStart], jointPoints[boneEnd], boneThickness, bodyColor);
                    }

                    // draw all joints
                    var jointColor = null;
                    for (var jointIndex = 0; jointIndex < jointCount; ++jointIndex) {
                        var trackingState = joints.lookup(jointIndex).trackingState;

                        // only draw if joint is tracked or inferred
                        if (trackingState == kinect.TrackingState.tracked) {
                            jointColor = TRACKEDJOINTCOLOR;
                        }
                        else if (trackingState == kinect.TrackingState.inferred) {
                            jointColor = INFERREDJOINTCOLOR;
                        }

                        if (jointColor != null) {
                            this.drawJoint(jointPoints[jointIndex], jointColor);
                        }
                    }
                },

                drawHand: function (jointPoint, handColor) {
                    // draw semi transparent hand cicles
                    bodyContext.globalAlpha = 0.75;
                    bodyContext.beginPath();
                    bodyContext.fillStyle = handColor;
                    bodyContext.arc(jointPoint.x, jointPoint.y, HANDSIZE, 0, Math.PI * 2, true);
                    bodyContext.fill();
                    bodyContext.closePath();
                    bodyContext.globalAlpha = 1;
                },

                // Draws clipped edges
                drawClippedEdges: function (body) {
                    var clippedEdges = body.clippedEdges;

                    bodyContext.fillStyle = "red";

                    if (this.hasClippedEdges(clippedEdges, kinect.FrameEdges.bottom)) {
                        bodyContext.fillRect(0, bodyCanvas.height - CLIPBOUNDSTHICKNESS, bodyCanvas.width, CLIPBOUNDSTHICKNESS);
                    }

                    if (this.hasClippedEdges(clippedEdges, kinect.FrameEdges.top)) {
                        bodyContext.fillRect(0, 0, bodyCanvas.width, CLIPBOUNDSTHICKNESS);
                    }

                    if (this.hasClippedEdges(clippedEdges, kinect.FrameEdges.left)) {
                        bodyContext.fillRect(0, 0, CLIPBOUNDSTHICKNESS, bodyCanvas.height);
                    }

                    if (this.hasClippedEdges(clippedEdges, kinect.FrameEdges.right)) {
                        bodyContext.fillRect(bodyCanvas.width - CLIPBOUNDSTHICKNESS, 0, CLIPBOUNDSTHICKNESS, bodyCanvas.height);
                    }
                },

                // Checks if an edge is clipped
                hasClippedEdges: function (edges, clippedEdge) {
                    return ((edges & clippedEdge) != 0);
                },

                // Allocate space for joint locations
                createJointPoints: function () {
                    var jointPoints = new Array();

                    for (var i = 0; i < jointCount; ++i) {
                        jointPoints.push({ joint: 0, x: 0, y: 0 });
                    }

                    return jointPoints;
                },

                // Create array of bones
                populateBones: function () {
                    var bones = new Array();

                    // torso
                    bones.push({ jointStart: kinect.JointType.head, jointEnd: kinect.JointType.neck });
                    bones.push({ jointStart: kinect.JointType.neck, jointEnd: kinect.JointType.spineShoulder });
                    bones.push({ jointStart: kinect.JointType.spineShoulder, jointEnd: kinect.JointType.spineMid });
                    bones.push({ jointStart: kinect.JointType.spineMid, jointEnd: kinect.JointType.spineBase });
                    bones.push({ jointStart: kinect.JointType.spineShoulder, jointEnd: kinect.JointType.shoulderRight });
                    bones.push({ jointStart: kinect.JointType.spineShoulder, jointEnd: kinect.JointType.shoulderLeft });
                    bones.push({ jointStart: kinect.JointType.spineBase, jointEnd: kinect.JointType.hipRight });
                    bones.push({ jointStart: kinect.JointType.spineBase, jointEnd: kinect.JointType.hipLeft });

                    // right arm
                    bones.push({ jointStart: kinect.JointType.shoulderRight, jointEnd: kinect.JointType.elbowRight });
                    bones.push({ jointStart: kinect.JointType.elbowRight, jointEnd: kinect.JointType.wristRight });
                    bones.push({ jointStart: kinect.JointType.wristRight, jointEnd: kinect.JointType.handRight });
                    bones.push({ jointStart: kinect.JointType.handRight, jointEnd: kinect.JointType.handTipRight });
                    bones.push({ jointStart: kinect.JointType.wristRight, jointEnd: kinect.JointType.thumbRight });

                    // left arm
                    bones.push({ jointStart: kinect.JointType.shoulderLeft, jointEnd: kinect.JointType.elbowLeft });
                    bones.push({ jointStart: kinect.JointType.elbowLeft, jointEnd: kinect.JointType.wristLeft });
                    bones.push({ jointStart: kinect.JointType.wristLeft, jointEnd: kinect.JointType.handLeft });
                    bones.push({ jointStart: kinect.JointType.handLeft, jointEnd: kinect.JointType.handTipLeft });
                    bones.push({ jointStart: kinect.JointType.wristLeft, jointEnd: kinect.JointType.thumbLeft });

                    // right leg
                    bones.push({ jointStart: kinect.JointType.hipRight, jointEnd: kinect.JointType.kneeRight });
                    bones.push({ jointStart: kinect.JointType.kneeRight, jointEnd: kinect.JointType.ankleRight });
                    bones.push({ jointStart: kinect.JointType.ankleRight, jointEnd: kinect.JointType.footRight });

                    // left leg
                    bones.push({ jointStart: kinect.JointType.hipLeft, jointEnd: kinect.JointType.kneeLeft });
                    bones.push({ jointStart: kinect.JointType.kneeLeft, jointEnd: kinect.JointType.ankleLeft });
                    bones.push({ jointStart: kinect.JointType.ankleLeft, jointEnd: kinect.JointType.footLeft });

                    return bones;
                }
            })
    });
})();