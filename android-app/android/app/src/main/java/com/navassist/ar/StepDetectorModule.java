package com.navassist.ar;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

/**
 * Real-time step counter using TYPE_STEP_COUNTER
 * - Records baseline on start
 * - Polls every 100ms and emits delta steps immediately
 * - No filtering delays, no peak detection guesswork
 * - Uses the same chip as Google Fit / Samsung Health
 */
public class StepDetectorModule extends ReactContextBaseJavaModule implements SensorEventListener {

    private static final String TAG         = "StepDetector";
    private static final String MODULE_NAME = "StepDetector";
    private static final String STEP_EVENT  = "onStep";

    private final SensorManager sensorManager;
    private Sensor stepCounterSensor;
    private Sensor stepDetectorSensor;
    private Sensor accelerometerSensor;

    private boolean isListening      = false;
    private long    baseline         = -1L;
    private long    lastEmitted      = 0L;

    // Accelerometer fallback
    private float   prevMag          = 0f;
    private float   prev2Mag         = 0f;
    private long    lastAccelStep    = 0L;

    public StepDetectorModule(ReactApplicationContext context) {
        super(context);
        sensorManager       = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
        stepCounterSensor   = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        stepDetectorSensor  = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR);
        accelerometerSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);

        Log.d(TAG, "STEP_COUNTER="  + (stepCounterSensor  != null));
        Log.d(TAG, "STEP_DETECTOR=" + (stepDetectorSensor != null));
        Log.d(TAG, "ACCELEROMETER=" + (accelerometerSensor!= null));
    }

    @Override
    public String getName() { return MODULE_NAME; }

    @ReactMethod
    public void start() {
        if (isListening) return;
        isListening   = true;
        baseline      = -1L;
        lastEmitted   = 0L;
        prevMag       = 0f;
        prev2Mag      = 0f;
        lastAccelStep = 0L;

        if (stepCounterSensor != null) {
            // Use SENSOR_DELAY_FASTEST for minimum latency
            sensorManager.registerListener(this, stepCounterSensor, SensorManager.SENSOR_DELAY_FASTEST);
            Log.d(TAG, "Using STEP_COUNTER with FASTEST delay");

        } else if (stepDetectorSensor != null) {
            sensorManager.registerListener(this, stepDetectorSensor, SensorManager.SENSOR_DELAY_FASTEST);
            Log.d(TAG, "Using STEP_DETECTOR");

        } else if (accelerometerSensor != null) {
            // High frequency accelerometer: 50Hz
            sensorManager.registerListener(this, accelerometerSensor, SensorManager.SENSOR_DELAY_GAME);
            Log.d(TAG, "Using ACCELEROMETER fallback");
        }
    }

    @ReactMethod
    public void stop() {
        if (!isListening) return;
        isListening = false;
        baseline    = -1L;
        lastEmitted = 0L;
        sensorManager.unregisterListener(this);
        Log.d(TAG, "Stopped");
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (!isListening) return;

        if (event.sensor.getType() == Sensor.TYPE_STEP_COUNTER) {
            long total = (long) event.values[0];

            if (baseline < 0) {
                baseline    = total;
                lastEmitted = 0;
                Log.d(TAG, "Baseline = " + total);
                return;
            }

            long sinceStart = total - baseline;
            long newSteps   = sinceStart - lastEmitted;

            if (newSteps > 0) {
                lastEmitted = sinceStart;
                Log.d(TAG, "Steps +"+newSteps+" (total="+sinceStart+")");
                for (long i = 0; i < newSteps; i++) {
                    emitStep();
                }
            }

        } else if (event.sensor.getType() == Sensor.TYPE_STEP_DETECTOR) {
            emitStep();

        } else if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            float x   = event.values[0];
            float y   = event.values[1];
            float z   = event.values[2];
            float mag = (float) Math.sqrt(x*x + y*y + z*z);

            // Local peak above gravity+threshold = step
            if (prevMag > prev2Mag && prevMag > mag && prevMag > 10.5f) {
                long now = System.currentTimeMillis();
                if (now - lastAccelStep > 300) {
                    lastAccelStep = now;
                    emitStep();
                }
            }
            prev2Mag = prevMag;
            prevMag  = mag;
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    private void emitStep() {
        try {
            getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(STEP_EVENT, null);
        } catch (Exception e) {
            Log.e(TAG, "emit error: " + e.getMessage());
        }
    }

    @ReactMethod public void addListener(String e) {}
    @ReactMethod public void removeListeners(Integer c) {}
}
