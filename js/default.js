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

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var kinect = WindowsPreview.Kinect;
    var vgb = Microsoft.Kinect.VisualGestureBuilder;

    // active Kinect sensor
    var sensor = null;

    // reader for body frames
    var bodyFrameReader = null;

    // maximum number of bodies supported by the sensor
    var maxBodies = 6;

    // kinectBodyView object responsible for rendering bodies to the screen
    var bodyView = null;

    // gesture detectors; there should be one for each body
    var detectors = [];

    // UI element IDs for each gesture detection object
    var resultViewIds = ["seatedResult_0", "seatedResult_1", "seatedResult_2", "seatedResult_3", "seatedResult_4", "seatedResult_5"];

    // collection of UI elements responsible for rendering gesture detection results to the screen
    var resultViews = [];

    // Handles the body frame data arriving from the sensor.
    function Reader_BodyFrameArrived(args) {
        // get body frame
        var bodyFrame = args.frameReference.acquireFrame();
        var dataReceived = false;

        if (bodyFrame != null) {
            // got a body, update body data
            bodyFrame.getAndRefreshBodyData(bodyView.bodies);
            dataReceived = true;
            bodyFrame.close();
        }

        if (dataReceived) {
            // Update the UI with the latest body data.
            bodyView.UpdateBodyFrame(sensor);

            for (var index = 0; index < maxBodies; ++index) {
                var body = bodyView.bodies[index];
                var trackingId = body.trackingId;

                if (body.isTracked) {
                    // Update the gesture detector with a valid trackingID and unpause the detector.
                    detectors[index].TrackingId = trackingId;
                    detectors[index].IsPaused = false;
                }
                else {
                    // Set the trackingId to invalid and pause the detector.
                    detectors[index].TrackingId = 0;
                    detectors[index].IsPaused = true;
                }

                // Update the UI with the latest gesture detection results.
                detectors[index].UpdateGestureResultView(resultViews[index]);
            }
        }
    }

    // Handler for sensor availability changes.
    function Sensor_IsAvailableChanged(args) {
        if (sensor.isAvailable) {
            document.getElementById("statustext").innerHTML = "Running";
        }
        else {
            document.getElementById("statustext").innerHTML = "Kinect not available!";
        }
    }

    // App initialization.
    app.onactivated = function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // get the kinectSensor object
                sensor = kinect.KinectSensor.getDefault();

                // add handler for sensor availability
                sensor.addEventListener("isavailablechanged", Sensor_IsAvailableChanged);

                // open the reader for frames
                bodyFrameReader = sensor.bodyFrameSource.openReader();

                // wire handler for frame arrival
                bodyFrameReader.addEventListener("framearrived", Reader_BodyFrameArrived);

                maxBodies = sensor.bodyFrameSource.bodyCount;

                bodyView = new KinectBodyView.BodyView(sensor);

                // initialize a VGB gesture detector for each body
                for (var index = 0; index < maxBodies; ++index) {
                    resultViews[index] = document.getElementById(resultViewIds[index]);
                    detectors[index] = new GestureDetector.Detector(sensor);
                }

                // open the sensor
                sensor.open();
            }
            else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }

            args.setPromise(WinJS.UI.processAll());
        }
    };

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. You might use the
        // WinJS.Application.sessionState object, which is automatically
        // saved and restored across suspension. If you need to complete an
        // asynchronous operation before your application is suspended, call
        // args.setPromise().
    };

    // App shut-down.
    app.onunload = function (args) {

        if (bodyFrameReader != null) {
            bodyFrameReader.close();
        }

        if (detectors != null) {
            for (var i = 0; i < detectors.length; ++i) {
                detectors[i].Close();
            }
        }

        if (sensor != null) {
            sensor.close();
        }
    }

    app.start();
})();