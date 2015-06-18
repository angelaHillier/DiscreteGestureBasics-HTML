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
    var vgb = Microsoft.Kinect.VisualGestureBuilder;

    WinJS.Namespace.define("GestureDetector", {
        Detector: WinJS.Class.define(
            function (kinectSensor) {

                if (kinectSensor == null) {
                    throw 'kinectSensor cannot be null';
                }

                this.kinectSensor = kinectSensor;
                this.isSeated = false;
                this.confidence = 0.0;

                // Initialize the VGB frame source.
                this.vgbFrameSource = vgb.VisualGestureBuilderFrameSource(kinectSensor, 0);

                // Initialize the VGB frame reader.
                this.vgbFrameReader = this.vgbFrameSource.openReader();
                this.vgbFrameReader.isPaused = true;
                this.vgbFrameReader.addEventListener("framearrived", this.Reader_GestureFrameArrived.bind(this));

                // Load the 'Seated' gesture from the VGB database.
                var database = vgb.VisualGestureBuilderDatabase("Database\\Seated.gbd");
                if (database != null) {
                    var gestures = database.availableGestures;

                    for (var index = 0; index < gestures.size; ++index) {
                        if (gestures[index].name == "Seated") {
                            this.vgbFrameSource.addGesture(gestures[index]);
                        }
                    }

                    database.close();
                }
            },

            // Detector class properties and functions.
            {
                // Gets or sets the body tracking ID associated with the current detector.
                // The tracking ID can change whenever a body comes in/out of scope.
                TrackingId: {
                    get: function () {
                        return this.vgbFrameSource.trackingId;
                    },
                    set: function (value) {
                        if (this.vgbFrameSource.trackingId != value) {
                            this.vgbFrameSource.trackingId = value;
                        }
                    }
                },

                // Gets or sets a value indicating whether or not the detector is currently paused.
                // If the body tracking ID associated with the detector is not valid, then the detector should be paused.
                IsPaused: {
                    get: function () {
                        return this.vgbFrameReader.isPaused;
                    },
                    set: function (value) {
                        if (this.vgbFrameReader.isPaused != value) {
                            this.vgbFrameReader.isPaused = value;
                        }
                    }
                },

                // Gets or sets a value indicating whether or not the currently tracked body is seated.
                IsSeated: {
                    get: function () {
                        return this.isSeated;
                    },
                    set: function (value) {
                        if (this.isSeated != value) {
                            this.isSeated = value;
                        }
                    }
                },

                // Gets or sets a value indicating the confidence level of the seated gesture result.
                Confidence: {
                    get: function () {
                        return this.confidence;
                    },
                    set: function (value) {
                        if (this.confidence != value) {
                            this.confidence = value;
                        }
                    }
                },

                // Handles gesture detection results arriving from the sensor for the associated body tracking Id.
                Reader_GestureFrameArrived: function (args) {
                    var gestureFrame = args.frameReference.acquireFrame();
                    var result = null;

                    if (gestureFrame != null) {
                        // get the latest detection result for the 'Seated' gesture
                        var discreteResults = gestureFrame.discreteGestureResults;

                        if (discreteResults != null) {
                            if (discreteResults.hasKey(gestureFrame.visualGestureBuilderFrameSource.gestures[0])) {
                                result = discreteResults.lookup(gestureFrame.visualGestureBuilderFrameSource.gestures[0]);
                                if (result != null) {
                                    this.IsSeated = result.detected;
                                    this.Confidence = result.confidence;
                                }
                            }
                        }

                        gestureFrame.close();
                    }
                    return result;
                },

                // Updates the UI to show the latest gesture results.
                UpdateGestureResultView: function (resultView) {
                    if (this.TrackingId != 0) {
                        if (this.IsSeated == true) {

                            resultView.textContent = "Seated: True Confidence: " + this.Confidence;
                        }
                        else {
                            resultView.textContent = "Seated: False";
                        }
                    }
                    else {
                        resultView.textContent = "(Not Tracked)";
                    }
                },

                // Cleans up the vgb frame reader and source objects.
                Close: function () {
                    if (this.vgbFrameReader != null) {
                        this.vgbFrameReader.close();
                    }

                    if (this.vgbFrameSource != null) {
                        this.vgbFrameSource.close();
                    }
                }
            })
    });
})();