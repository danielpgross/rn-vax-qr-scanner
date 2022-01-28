import React, { useEffect, useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraPermissionStatus, Camera, useCameraDevices } from "react-native-vision-camera"
import { useScanBarcodes, BarcodeFormat } from "vision-camera-code-scanner"

const CameraScreen = ({ navigation }) => {
  // Request camera permissions
  const [cameraPermission, setCameraPermission] = useState<CameraPermissionStatus>()

  useEffect(() => {
    Camera.getCameraPermissionStatus().then(setCameraPermission)
  }, [])

  const devices = useCameraDevices()
  const device = devices.back

  const [frameProcessor, barcodes] = useScanBarcodes([BarcodeFormat.QR_CODE]);

  const decodeQrCode = useMemo(async () => {
    if (barcodes.length) {
      const rawQRInputs = barcodes.map(barcode => barcode.content.data)
      navigation.navigate('Details', { rawQRInputs })
    }
  }, [barcodes])

  if (cameraPermission == null) {
    // still loading
    return null
  } else if (cameraPermission === 'not-determined') {
    Camera.requestCameraPermission().then(setCameraPermission)
  }

  if (cameraPermission !== 'authorized') {
    return (
      <SafeAreaView>
        <Text>Can't access camera -- check permissions and try again</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{
      flex: 1,
      backgroundColor: 'black',
    }}>
      {device != null && (
        <>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            frameProcessor={frameProcessor}
            frameProcessorFps={5}
          />
        </>
      )}
    </SafeAreaView>
  )
}

export default CameraScreen