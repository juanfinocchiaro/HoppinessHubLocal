@echo off
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo   ==========================================
echo   Hoppiness Hub - Instalador de Impresoras
echo   v2.0.0 - Con soporte de logo bitmap
echo   ==========================================
echo.

:: Paso 1: Verificar Node.js
echo   [1/4] Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   Node.js no encontrado. Descargando...
    powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi' -OutFile '%TEMP%\node-install.msi'; Start-Process msiexec.exe -ArgumentList '/i', '%TEMP%\node-install.msi', '/quiet', '/norestart' -Wait; Remove-Item '%TEMP%\node-install.msi' -ErrorAction SilentlyContinue"
    set "PATH=%PROGRAMFILES%\nodejs;%PATH%"
    echo   Node.js instalado OK.
) else (
    for /f "tokens=*" %%v in ('node -v') do echo   Node.js %%v OK.
)
echo.

:: Paso 2: Escribir print-bridge.js desde base64
echo   [2/4] Instalando Print Bridge v2.0.0...
if not exist "%PROGRAMFILES%\Hoppiness Hub" mkdir "%PROGRAMFILES%\Hoppiness Hub"

:: Escribir base64 a archivo temporal
> "%TEMP%\pb.b64" echo -----BEGIN CERTIFICATE-----
>> "%TEMP%\pb.b64" echo Y29uc3QgaHR0cCA9IHJlcXVpcmUoJ2h0dHAnKTsKY29uc3QgbmV0ID0gcmVxdWlyZSgnbmV0Jyk7
>> "%TEMP%\pb.b64" echo CmNvbnN0IHpsaWIgPSByZXF1aXJlKCd6bGliJyk7Cgpjb25zdCBQT1JUID0gMzAwMTsKY29uc3Qg
>> "%TEMP%\pb.b64" echo SE9TVCA9ICcxMjcuMC4wLjEnOwpjb25zdCBWRVJTSU9OID0gJzIuMC4wJzsKCi8vIOKVkOKVkOKV
>> "%TEMP%\pb.b64" echo kOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKV
>> "%TEMP%\pb.b64" echo kOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKV
>> "%TEMP%\pb.b64" echo kOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkAov
>> "%TEMP%\pb.b64" echo LyBQTkcg4oaSIE1vbm9jaHJvbWUgQml0bWFwIOKGkiBFU0MvUE9TIFJhc3RlcgovLyBQdXJlIE5v
>> "%TEMP%\pb.b64" echo ZGUuanMsIHplcm8gZGVwZW5kZW5jaWVzCi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKV
>> "%TEMP%\pb.b64" echo kOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKV
>> "%TEMP%\pb.b64" echo kOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKV
>> "%TEMP%\pb.b64" echo kOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkAoKZnVuY3Rpb24gcGFyc2VQTkcoYnVm
>> "%TEMP%\pb.b64" echo KSB7CiAgLy8gVmVyaWZ5IFBORyBzaWduYXR1cmUKICBjb25zdCBzaWcgPSBbMTM3LCA4MCwgNzgs
>> "%TEMP%\pb.b64" echo IDcxLCAxMywgMTAsIDI2LCAxMF07CiAgZm9yIChsZXQgaSA9IDA7IGkgPCA4OyBpKyspIHsKICAg
>> "%TEMP%\pb.b64" echo IGlmIChidWZbaV0gIT09IHNpZ1tpXSkgdGhyb3cgbmV3IEVycm9yKCdOb3QgYSBQTkcnKTsKICB9
>> "%TEMP%\pb.b64" echo CgogIGxldCB3aWR0aCA9IDAsIGhlaWdodCA9IDAsIGJpdERlcHRoID0gMCwgY29sb3JUeXBlID0g
>> "%TEMP%\pb.b64" echo MDsKICBjb25zdCBpZGF0Q2h1bmtzID0gW107CiAgbGV0IG9mZnNldCA9IDg7CgogIHdoaWxlIChv
>> "%TEMP%\pb.b64" echo ZmZzZXQgPCBidWYubGVuZ3RoKSB7CiAgICBjb25zdCBsZW5ndGggPSBidWYucmVhZFVJbnQzMkJF
>> "%TEMP%\pb.b64" echo KG9mZnNldCk7CiAgICBjb25zdCB0eXBlID0gYnVmLnNsaWNlKG9mZnNldCArIDQsIG9mZnNldCAr
>> "%TEMP%\pb.b64" echo IDgpLnRvU3RyaW5nKCdhc2NpaScpOwogICAgY29uc3QgZGF0YSA9IGJ1Zi5zbGljZShvZmZzZXQg
>> "%TEMP%\pb.b64" echo KyA4LCBvZmZzZXQgKyA4ICsgbGVuZ3RoKTsKCiAgICBpZiAodHlwZSA9PT0gJ0lIRFInKSB7CiAg
>> "%TEMP%\pb.b64" echo ICAgIHdpZHRoID0gZGF0YS5yZWFkVUludDMyQkUoMCk7CiAgICAgIGhlaWdodCA9IGRhdGEucmVh
>> "%TEMP%\pb.b64" echo ZFVJbnQzMkJFKDQpOwogICAgICBiaXREZXB0aCA9IGRhdGFbOF07CiAgICAgIGNvbG9yVHlwZSA9
>> "%TEMP%\pb.b64" echo IGRhdGFbOV07CiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdJREFUJykgewogICAgICBpZGF0Q2h1
>> "%TEMP%\pb.b64" echo bmtzLnB1c2goZGF0YSk7CiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdJRU5EJykgewogICAgICBi
>> "%TEMP%\pb.b64" echo cmVhazsKICAgIH0KICAgIG9mZnNldCArPSAxMiArIGxlbmd0aDsKICB9CgogIGlmICghd2lkdGgg
>> "%TEMP%\pb.b64" echo fHwgIWhlaWdodCkgdGhyb3cgbmV3IEVycm9yKCdObyBJSERSIGNodW5rJyk7CgogIC8vIERlY29t
>> "%TEMP%\pb.b64" echo cHJlc3MgSURBVAogIGNvbnN0IGNvbXByZXNzZWQgPSBCdWZmZXIuY29uY2F0KGlkYXRDaHVua3Mp
>> "%TEMP%\pb.b64" echo OwogIGNvbnN0IHJhdyA9IHpsaWIuaW5mbGF0ZVN5bmMoY29tcHJlc3NlZCk7CgogIC8vIEJ5dGVz
>> "%TEMP%\pb.b64" echo IHBlciBwaXhlbCBiYXNlZCBvbiBjb2xvciB0eXBlCiAgbGV0IGJwcDsKICBzd2l0Y2ggKGNvbG9y
>> "%TEMP%\pb.b64" echo VHlwZSkgewogICAgY2FzZSAwOiBicHAgPSAxOyBicmVhazsgIC8vIEdyYXlzY2FsZQogICAgY2Fz
>> "%TEMP%\pb.b64" echo ZSAyOiBicHAgPSAzOyBicmVhazsgIC8vIFJHQgogICAgY2FzZSA0OiBicHAgPSAyOyBicmVhazsg
>> "%TEMP%\pb.b64" echo IC8vIEdyYXlzY2FsZSArIEFscGhhCiAgICBjYXNlIDY6IGJwcCA9IDQ7IGJyZWFrOyAgLy8gUkdC
>> "%TEMP%\pb.b64" echo QQogICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCdVbnN1cHBvcnRlZCBjb2xvciB0eXBlOiAn
>> "%TEMP%\pb.b64" echo ICsgY29sb3JUeXBlKTsKICB9CgogIGNvbnN0IHN0cmlkZSA9IHdpZHRoICogYnBwOwogIGNvbnN0
>> "%TEMP%\pb.b64" echo IHBpeGVscyA9IEJ1ZmZlci5hbGxvYyhoZWlnaHQgKiBzdHJpZGUpOwoKICBmdW5jdGlvbiBwYWV0
>> "%TEMP%\pb.b64" echo aChhLCBiLCBjKSB7CiAgICBjb25zdCBwID0gYSArIGIgLSBjOwogICAgY29uc3QgcGEgPSBNYXRo
>> "%TEMP%\pb.b64" echo LmFicyhwIC0gYSk7CiAgICBjb25zdCBwYiA9IE1hdGguYWJzKHAgLSBiKTsKICAgIGNvbnN0IHBj
>> "%TEMP%\pb.b64" echo ID0gTWF0aC5hYnMocCAtIGMpOwogICAgaWYgKHBhIDw9IHBiICYmIHBhIDw9IHBjKSByZXR1cm4g
>> "%TEMP%\pb.b64" echo YTsKICAgIGlmIChwYiA8PSBwYykgcmV0dXJuIGI7CiAgICByZXR1cm4gYzsKICB9CgogIC8vIFVu
>> "%TEMP%\pb.b64" echo ZmlsdGVyIHNjYW5saW5lcwogIGxldCByaSA9IDA7CiAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWln
>> "%TEMP%\pb.b64" echo aHQ7IHkrKykgewogICAgY29uc3QgZmlsdGVyVHlwZSA9IHJhd1tyaSsrXTsKICAgIGNvbnN0IHJv
>> "%TEMP%\pb.b64" echo d1N0YXJ0ID0geSAqIHN0cmlkZTsKICAgIGNvbnN0IHByZXZTdGFydCA9ICh5IC0gMSkgKiBzdHJp
>> "%TEMP%\pb.b64" echo ZGU7CgogICAgZm9yIChsZXQgeCA9IDA7IHggPCBzdHJpZGU7IHgrKykgewogICAgICBjb25zdCBy
>> "%TEMP%\pb.b64" echo YXdCeXRlID0gcmF3W3JpKytdOwogICAgICBjb25zdCBhID0geCA+PSBicHAgPyBwaXhlbHNbcm93
>> "%TEMP%\pb.b64" echo U3RhcnQgKyB4IC0gYnBwXSA6IDA7CiAgICAgIGNvbnN0IGIyID0geSA+IDAgPyBwaXhlbHNbcHJl
>> "%TEMP%\pb.b64" echo dlN0YXJ0ICsgeF0gOiAwOwogICAgICBjb25zdCBjMiA9ICh4ID49IGJwcCAmJiB5ID4gMCkgPyBw
>> "%TEMP%\pb.b64" echo aXhlbHNbcHJldlN0YXJ0ICsgeCAtIGJwcF0gOiAwOwoKICAgICAgbGV0IHZhbDsKICAgICAgc3dp
>> "%TEMP%\pb.b64" echo dGNoIChmaWx0ZXJUeXBlKSB7CiAgICAgICAgY2FzZSAwOiB2YWwgPSByYXdCeXRlOyBicmVhazsK
>> "%TEMP%\pb.b64" echo ICAgICAgICBjYXNlIDE6IHZhbCA9IChyYXdCeXRlICsgYSkgJiAweEZGOyBicmVhazsKICAgICAg
>> "%TEMP%\pb.b64" echo ICBjYXNlIDI6IHZhbCA9IChyYXdCeXRlICsgYjIpICYgMHhGRjsgYnJlYWs7CiAgICAgICAgY2Fz
>> "%TEMP%\pb.b64" echo ZSAzOiB2YWwgPSAocmF3Qnl0ZSArIE1hdGguZmxvb3IoKGEgKyBiMikgLyAyKSkgJiAweEZGOyBi
>> "%TEMP%\pb.b64" echo cmVhazsKICAgICAgICBjYXNlIDQ6IHZhbCA9IChyYXdCeXRlICsgcGFldGgoYSwgYjIsIGMyKSkg
>> "%TEMP%\pb.b64" echo JiAweEZGOyBicmVhazsKICAgICAgICBkZWZhdWx0OiB2YWwgPSByYXdCeXRlOwogICAgICB9CiAg
>> "%TEMP%\pb.b64" echo ICAgIHBpeGVsc1tyb3dTdGFydCArIHhdID0gdmFsOwogICAgfQogIH0KCiAgcmV0dXJuIHsgd2lk
>> "%TEMP%\pb.b64" echo dGgsIGhlaWdodCwgYnBwLCBjb2xvclR5cGUsIHBpeGVscyB9Owp9CgpmdW5jdGlvbiB0b01vbm9j
>> "%TEMP%\pb.b64" echo aHJvbWUocG5nKSB7CiAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBicHAsIGNvbG9yVHlwZSwgcGl4
>> "%TEMP%\pb.b64" echo ZWxzIH0gPSBwbmc7CiAgY29uc3QgYnl0ZXNQZXJSb3cgPSBNYXRoLmNlaWwod2lkdGggLyA4KTsK
>> "%TEMP%\pb.b64" echo ICBjb25zdCByYXN0ZXIgPSBCdWZmZXIuYWxsb2MoYnl0ZXNQZXJSb3cgKiBoZWlnaHQpOwoKICBm
>> "%TEMP%\pb.b64" echo b3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKSB7CiAgICBmb3IgKGxldCB4ID0gMDsgeCA8
>> "%TEMP%\pb.b64" echo IHdpZHRoOyB4KyspIHsKICAgICAgY29uc3QgcGkgPSAoeSAqIHdpZHRoICsgeCkgKiBicHA7CiAg
>> "%TEMP%\pb.b64" echo ICAgIGxldCBsdW1hLCBhbHBoYSA9IDI1NTsKCiAgICAgIHN3aXRjaCAoY29sb3JUeXBlKSB7CiAg
>> "%TEMP%\pb.b64" echo ICAgICAgY2FzZSAwOiBsdW1hID0gcGl4ZWxzW3BpXTsgYnJlYWs7CiAgICAgICAgY2FzZSAyOiBs
>> "%TEMP%\pb.b64" echo dW1hID0gMC4yOTkgKiBwaXhlbHNbcGldICsgMC41ODcgKiBwaXhlbHNbcGkgKyAxXSArIDAuMTE0
>> "%TEMP%\pb.b64" echo ICogcGl4ZWxzW3BpICsgMl07IGJyZWFrOwogICAgICAgIGNhc2UgNDogbHVtYSA9IHBpeGVsc1tw
>> "%TEMP%\pb.b64" echo aV07IGFscGhhID0gcGl4ZWxzW3BpICsgMV07IGJyZWFrOwogICAgICAgIGNhc2UgNjogbHVtYSA9
>> "%TEMP%\pb.b64" echo IDAuMjk5ICogcGl4ZWxzW3BpXSArIDAuNTg3ICogcGl4ZWxzW3BpICsgMV0gKyAwLjExNCAqIHBp
>> "%TEMP%\pb.b64" echo eGVsc1twaSArIDJdOyBhbHBoYSA9IHBpeGVsc1twaSArIDNdOyBicmVhazsKICAgICAgICBkZWZh
>> "%TEMP%\pb.b64" echo dWx0OiBsdW1hID0gMjU1OwogICAgICB9CgogICAgICAvLyBUcmFuc3BhcmVudCA9IHdoaXRlIChu
>> "%TEMP%\pb.b64" echo byBwcmludCkKICAgICAgaWYgKGFscGhhIDwgMTI4KSBsdW1hID0gMjU1OwoKICAgICAgLy8gQmxh
>> "%TEMP%\pb.b64" echo Y2sgcGl4ZWwgPSBzZXQgYml0ICh0aGVybWFsIHByaW50ZXIgcHJpbnRzIHdoZXJlIGJpdD0xKQog
>> "%TEMP%\pb.b64" echo ICAgICBpZiAobHVtYSA8IDEyOCkgewogICAgICAgIGNvbnN0IGJ5dGVJbmRleCA9IHkgKiBieXRl
>> "%TEMP%\pb.b64" echo c1BlclJvdyArIE1hdGguZmxvb3IoeCAvIDgpOwogICAgICAgIHJhc3RlcltieXRlSW5kZXhdIHw9
>> "%TEMP%\pb.b64" echo ICgxIDw8ICg3IC0gKHggJSA4KSkpOwogICAgICB9CiAgICB9CiAgfQoKICByZXR1cm4geyByYXN0
>> "%TEMP%\pb.b64" echo ZXIsIGJ5dGVzUGVyUm93LCB3aWR0aCwgaGVpZ2h0IH07Cn0KCmZ1bmN0aW9uIHRvRXNjUG9zUmFz
>> "%TEMP%\pb.b64" echo dGVyKG1vbm8pIHsKICBjb25zdCB7IHJhc3RlciwgYnl0ZXNQZXJSb3csIGhlaWdodCB9ID0gbW9u
>> "%TEMP%\pb.b64" echo bzsKICBjb25zdCB4TCA9IGJ5dGVzUGVyUm93ICYgMHhGRjsKICBjb25zdCB4SCA9IChieXRlc1Bl
>> "%TEMP%\pb.b64" echo clJvdyA+PiA4KSAmIDB4RkY7CiAgY29uc3QgeUwgPSBoZWlnaHQgJiAweEZGOwogIGNvbnN0IHlI
>> "%TEMP%\pb.b64" echo ID0gKGhlaWdodCA+PiA4KSAmIDB4RkY7CgogIC8vIEdTIHYgMCAtIFByaW50IHJhc3RlciBiaXQg
>> "%TEMP%\pb.b64" echo aW1hZ2UKICBjb25zdCBoZWFkZXIgPSBCdWZmZXIuZnJvbShbMHgxRCwgMHg3NiwgMHgzMCwgMHgw
>> "%TEMP%\pb.b64" echo MCwgeEwsIHhILCB5TCwgeUhdKTsKICByZXR1cm4gQnVmZmVyLmNvbmNhdChbaGVhZGVyLCByYXN0
>> "%TEMP%\pb.b64" echo ZXJdKTsKfQoKLyoqCiAqIFNjYW4gYnVmZmVyIGZvciBfX0JJVE1BUF9CNjQ6Li4uOkVORF9fIG1h
>> "%TEMP%\pb.b64" echo cmtlcnMgYW5kIHJlcGxhY2UKICogd2l0aCBhY3R1YWwgRVNDL1BPUyByYXN0ZXIgYml0bWFwIGNv
>> "%TEMP%\pb.b64" echo bW1hbmRzLgogKi8KZnVuY3Rpb24gcHJvY2Vzc0J1ZmZlcihidWYpIHsKICBjb25zdCBzdHIgPSBi
>> "%TEMP%\pb.b64" echo dWYudG9TdHJpbmcoJ2JpbmFyeScpOwogIGNvbnN0IHN0YXJ0TWFya2VyID0gJ19fQklUTUFQX0I2
>> "%TEMP%\pb.b64" echo NDonOwogIGNvbnN0IGVuZE1hcmtlciA9ICc6RU5EX18nOwoKICBjb25zdCBzaSA9IHN0ci5pbmRl
>> "%TEMP%\pb.b64" echo eE9mKHN0YXJ0TWFya2VyKTsKICBpZiAoc2kgPT09IC0xKSByZXR1cm4gYnVmOwoKICBjb25zdCBi
>> "%TEMP%\pb.b64" echo NjRTdGFydCA9IHNpICsgc3RhcnRNYXJrZXIubGVuZ3RoOwogIGNvbnN0IGVpID0gc3RyLmluZGV4
>> "%TEMP%\pb.b64" echo T2YoZW5kTWFya2VyLCBiNjRTdGFydCk7CiAgaWYgKGVpID09PSAtMSkgcmV0dXJuIGJ1ZjsKCiAg
>> "%TEMP%\pb.b64" echo Y29uc3QgYjY0ID0gc3RyLnN1YnN0cmluZyhiNjRTdGFydCwgZWkpOwogIGNvbnN0IG1hcmtlckVu
>> "%TEMP%\pb.b64" echo ZCA9IGVpICsgZW5kTWFya2VyLmxlbmd0aDsKCiAgdHJ5IHsKICAgIGNvbnN0IHBuZ0J1ZiA9IEJ1
>> "%TEMP%\pb.b64" echo ZmZlci5mcm9tKGI2NCwgJ2Jhc2U2NCcpOwogICAgY29uc3QgcG5nID0gcGFyc2VQTkcocG5nQnVm
>> "%TEMP%\pb.b64" echo KTsKICAgIGNvbnN0IG1vbm8gPSB0b01vbm9jaHJvbWUocG5nKTsKICAgIGNvbnN0IHJhc3RlckNt
>> "%TEMP%\pb.b64" echo ZCA9IHRvRXNjUG9zUmFzdGVyKG1vbm8pOwoKICAgIC8vIENlbnRlciB0aGUgaW1hZ2U6IEVTQyBh
>> "%TEMP%\pb.b64" echo IDEgKGNlbnRlciBhbGlnbikgYmVmb3JlLCBFU0MgYSAwIChsZWZ0KSBhZnRlcgogICAgY29uc3Qg
>> "%TEMP%\pb.b64" echo Y2VudGVyID0gQnVmZmVyLmZyb20oWzB4MUIsIDB4NjEsIDB4MDFdKTsKICAgIGNvbnN0IGxlZnQg
>> "%TEMP%\pb.b64" echo PSBCdWZmZXIuZnJvbShbMHgxQiwgMHg2MSwgMHgwMF0pOwoKICAgIGNvbnN0IGJlZm9yZSA9IGJ1
>> "%TEMP%\pb.b64" echo Zi5zbGljZSgwLCBzaSk7CiAgICBjb25zdCBhZnRlciA9IHByb2Nlc3NCdWZmZXIoYnVmLnNsaWNl
>> "%TEMP%\pb.b64" echo KG1hcmtlckVuZCkpOyAvLyBSZWN1cnNlIGZvciBtdWx0aXBsZSBiaXRtYXBzCiAgICByZXR1cm4g
>> "%TEMP%\pb.b64" echo QnVmZmVyLmNvbmNhdChbYmVmb3JlLCBjZW50ZXIsIHJhc3RlckNtZCwgbGVmdCwgYWZ0ZXJdKTsK
>> "%TEMP%\pb.b64" echo ICB9IGNhdGNoIChlKSB7CiAgICBjb25zb2xlLmVycm9yKCdCaXRtYXAgcHJvY2Vzc2luZyBlcnJv
>> "%TEMP%\pb.b64" echo cjonLCBlLm1lc3NhZ2UpOwogICAgLy8gUmVtb3ZlIG1hcmtlciwgY29udGludWUgd2l0aCByZXN0
>> "%TEMP%\pb.b64" echo CiAgICBjb25zdCBiZWZvcmUgPSBidWYuc2xpY2UoMCwgc2kpOwogICAgY29uc3QgYWZ0ZXIgPSBw
>> "%TEMP%\pb.b64" echo cm9jZXNzQnVmZmVyKGJ1Zi5zbGljZShtYXJrZXJFbmQpKTsKICAgIHJldHVybiBCdWZmZXIuY29u
>> "%TEMP%\pb.b64" echo Y2F0KFtiZWZvcmUsIGFmdGVyXSk7CiAgfQp9CgovLyDilZDilZDilZDilZDilZDilZDilZDilZDi
>> "%TEMP%\pb.b64" echo lZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDi
>> "%TEMP%\pb.b64" echo lZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDi
>> "%TEMP%\pb.b64" echo lZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZAKLy8gSFRUUCBTZXJ2ZXIKLy8g
>> "%TEMP%\pb.b64" echo 4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ
>> "%TEMP%\pb.b64" echo 4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ
>> "%TEMP%\pb.b64" echo 4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ
>> "%TEMP%\pb.b64" echo 4pWQ4pWQCgpjb25zdCBzZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcigocmVxLCByZXMpID0+IHsK
>> "%TEMP%\pb.b64" echo ICAvLyBDT1JTCiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywg
>> "%TEMP%\pb.b64" echo JyonKTsKICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgJ1BP
>> "%TEMP%\pb.b64" echo U1QsIEdFVCwgT1BUSU9OUycpOwogIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93
>> "%TEMP%\pb.b64" echo LUhlYWRlcnMnLCAnQ29udGVudC1UeXBlJyk7CgogIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9O
>> "%TEMP%\pb.b64" echo UycpIHsKICAgIHJlcy53cml0ZUhlYWQoMjA0KTsKICAgIHJlcy5lbmQoKTsKICAgIHJldHVybjsK
>> "%TEMP%\pb.b64" echo ICB9CgogIC8vIEdFVCAvc3RhdHVzCiAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnICYmIHJlcS51
>> "%TEMP%\pb.b64" echo cmwgPT09ICcvc3RhdHVzJykgewogICAgcmVzLndyaXRlSGVhZCgyMDAsIHsgJ0NvbnRlbnQtVHlw
>> "%TEMP%\pb.b64" echo ZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTsKICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoewog
>> "%TEMP%\pb.b64" echo ICAgICBzdGF0dXM6ICdvaycsCiAgICAgIHZlcnNpb246IFZFUlNJT04sCiAgICAgIGJpdG1hcDog
>> "%TEMP%\pb.b64" echo dHJ1ZQogICAgfSkpOwogICAgcmV0dXJuOwogIH0KCiAgLy8gUE9TVCAvcHJpbnQKICBpZiAocmVx
>> "%TEMP%\pb.b64" echo Lm1ldGhvZCA9PT0gJ1BPU1QnICYmIHJlcS51cmwgPT09ICcvcHJpbnQnKSB7CiAgICBsZXQgYm9k
>> "%TEMP%\pb.b64" echo eSA9ICcnOwogICAgcmVxLm9uKCdkYXRhJywgY2h1bmsgPT4geyBib2R5ICs9IGNodW5rOyB9KTsK
>> "%TEMP%\pb.b64" echo ICAgIHJlcS5vbignZW5kJywgKCkgPT4gewogICAgICB0cnkgewogICAgICAgIGNvbnN0IHsgaXAs
>> "%TEMP%\pb.b64" echo IHBvcnQsIGRhdGEgfSA9IEpTT04ucGFyc2UoYm9keSk7CiAgICAgICAgY29uc3QgcmF3QnVmZmVy
>> "%TEMP%\pb.b64" echo ID0gQnVmZmVyLmZyb20oZGF0YSwgJ2Jhc2U2NCcpOwogICAgICAgIGNvbnN0IGJ1ZmZlciA9IHBy
>> "%TEMP%\pb.b64" echo b2Nlc3NCdWZmZXIocmF3QnVmZmVyKTsKCiAgICAgICAgY29uc3Qgc29ja2V0ID0gbmV3IG5ldC5T
>> "%TEMP%\pb.b64" echo b2NrZXQoKTsKICAgICAgICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7CiAgICAg
>> "%TEMP%\pb.b64" echo ICAgICBzb2NrZXQuZGVzdHJveSgpOwogICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDQsIHsgJ0Nv
>> "%TEMP%\pb.b64" echo bnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTsKICAgICAgICAgIHJlcy5lbmQoSlNP
>> "%TEMP%\pb.b64" echo Ti5zdHJpbmdpZnkoewogICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSwKICAgICAgICAgICAgZXJy
>> "%TEMP%\pb.b64" echo b3I6ICdUaW1lb3V0OiBsYSBpbXByZXNvcmEgbm8gcmVzcG9uZGlvIGVuIDVzJwogICAgICAgICAg
>> "%TEMP%\pb.b64" echo fSkpOwogICAgICAgIH0sIDUwMDApOwoKICAgICAgICBzb2NrZXQuY29ubmVjdChwb3J0IHx8IDkx
>> "%TEMP%\pb.b64" echo MDAsIGlwLCAoKSA9PiB7CiAgICAgICAgICBzb2NrZXQud3JpdGUoYnVmZmVyLCAoKSA9PiB7CiAg
>> "%TEMP%\pb.b64" echo ICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTsKICAgICAgICAgICAgc29ja2V0LmVuZCgp
>> "%TEMP%\pb.b64" echo OwogICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxp
>> "%TEMP%\pb.b64" echo Y2F0aW9uL2pzb24nIH0pOwogICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3Vj
>> "%TEMP%\pb.b64" echo Y2VzczogdHJ1ZSB9KSk7CiAgICAgICAgICB9KTsKICAgICAgICB9KTsKCiAgICAgICAgc29ja2V0
>> "%TEMP%\pb.b64" echo Lm9uKCdlcnJvcicsIGVyciA9PiB7CiAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7CiAg
>> "%TEMP%\pb.b64" echo ICAgICAgICByZXMud3JpdGVIZWFkKDUwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9u
>> "%TEMP%\pb.b64" echo L2pzb24nIH0pOwogICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7CiAgICAgICAgICAg
>> "%TEMP%\pb.b64" echo IHN1Y2Nlc3M6IGZhbHNlLAogICAgICAgICAgICBlcnJvcjogaXAgKyAnOicgKyAocG9ydCB8fCA5
>> "%TEMP%\pb.b64" echo MTAwKSArICcgLSAnICsgZXJyLm1lc3NhZ2UKICAgICAgICAgIH0pKTsKICAgICAgICB9KTsKICAg
>> "%TEMP%\pb.b64" echo ICAgfSBjYXRjaCAoZXJyKSB7CiAgICAgICAgcmVzLndyaXRlSGVhZCg0MDAsIHsgJ0NvbnRlbnQt
>> "%TEMP%\pb.b64" echo VHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTsKICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5n
>> "%TEMP%\pb.b64" echo aWZ5KHsKICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLAogICAgICAgICAgZXJyb3I6ICdEYXRvcyBp
>> "%TEMP%\pb.b64" echo bnZhbGlkb3M6ICcgKyBlcnIubWVzc2FnZQogICAgICAgIH0pKTsKICAgICAgfQogICAgfSk7CiAg
>> "%TEMP%\pb.b64" echo ICByZXR1cm47CiAgfQoKICAvLyBQT1NUIC90ZXN0CiAgaWYgKHJlcS5tZXRob2QgPT09ICdQT1NU
>> "%TEMP%\pb.b64" echo JyAmJiByZXEudXJsID09PSAnL3Rlc3QnKSB7CiAgICBsZXQgYm9keSA9ICcnOwogICAgcmVxLm9u
>> "%TEMP%\pb.b64" echo KCdkYXRhJywgY2h1bmsgPT4geyBib2R5ICs9IGNodW5rOyB9KTsKICAgIHJlcS5vbignZW5kJywg
>> "%TEMP%\pb.b64" echo KCkgPT4gewogICAgICB0cnkgewogICAgICAgIGNvbnN0IHsgaXAsIHBvcnQgfSA9IEpTT04ucGFy
>> "%TEMP%\pb.b64" echo c2UoYm9keSk7CiAgICAgICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpOwogICAgICAgIGNvbnN0
>> "%TEMP%\pb.b64" echo IHNvY2tldCA9IG5ldyBuZXQuU29ja2V0KCk7CiAgICAgICAgY29uc3QgdGltZW91dCA9IHNldFRp
>> "%TEMP%\pb.b64" echo bWVvdXQoKCkgPT4gewogICAgICAgICAgc29ja2V0LmRlc3Ryb3koKTsKICAgICAgICAgIHJlcy53
>> "%TEMP%\pb.b64" echo cml0ZUhlYWQoMjAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7CiAg
>> "%TEMP%\pb.b64" echo ICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgcmVhY2hhYmxlOiBmYWxzZSwgZXJyb3I6
>> "%TEMP%\pb.b64" echo ICdUaW1lb3V0JyB9KSk7CiAgICAgICAgfSwgMzAwMCk7CgogICAgICAgIHNvY2tldC5jb25uZWN0
>> "%TEMP%\pb.b64" echo KHBvcnQgfHwgOTEwMCwgaXAsICgpID0+IHsKICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0
>> "%TEMP%\pb.b64" echo KTsKICAgICAgICAgIGNvbnN0IGxhdGVuY3kgPSBEYXRlLm5vdygpIC0gc3RhcnQ7CiAgICAgICAg
>> "%TEMP%\pb.b64" echo ICBzb2NrZXQuZW5kKCk7CiAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwgeyAnQ29udGVudC1U
>> "%TEMP%\pb.b64" echo eXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pOwogICAgICAgICAgcmVzLmVuZChKU09OLnN0cmlu
>> "%TEMP%\pb.b64" echo Z2lmeSh7IHJlYWNoYWJsZTogdHJ1ZSwgbGF0ZW5jeU1zOiBsYXRlbmN5IH0pKTsKICAgICAgICB9
>> "%TEMP%\pb.b64" echo KTsKCiAgICAgICAgc29ja2V0Lm9uKCdlcnJvcicsIGVyciA9PiB7CiAgICAgICAgICBjbGVhclRp
>> "%TEMP%\pb.b64" echo bWVvdXQodGltZW91dCk7CiAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwgeyAnQ29udGVudC1U
>> "%TEMP%\pb.b64" echo eXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pOwogICAgICAgICAgcmVzLmVuZChKU09OLnN0cmlu
>> "%TEMP%\pb.b64" echo Z2lmeSh7IHJlYWNoYWJsZTogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KSk7CiAgICAgICAg
>> "%TEMP%\pb.b64" echo fSk7CiAgICAgIH0gY2F0Y2ggKGVycikgewogICAgICAgIHJlcy53cml0ZUhlYWQoNDAwLCB7ICdD
>> "%TEMP%\pb.b64" echo b250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7CiAgICAgICAgcmVzLmVuZChKU09O
>> "%TEMP%\pb.b64" echo LnN0cmluZ2lmeSh7IHJlYWNoYWJsZTogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KSk7CiAg
>> "%TEMP%\pb.b64" echo ICAgIH0KICAgIH0pOwogICAgcmV0dXJuOwogIH0KCiAgcmVzLndyaXRlSGVhZCg0MDQpOwogIHJl
>> "%TEMP%\pb.b64" echo cy5lbmQoJ05vdCBmb3VuZCcpOwp9KTsKCnNlcnZlci5saXN0ZW4oUE9SVCwgSE9TVCwgKCkgPT4g
>> "%TEMP%\pb.b64" echo ewogIGNvbnNvbGUubG9nKCdIb3BwaW5lc3MgUHJpbnQgQnJpZGdlIHYnICsgVkVSU0lPTik7CiAg
>> "%TEMP%\pb.b64" echo Y29uc29sZS5sb2coJ2h0dHA6Ly8nICsgSE9TVCArICc6JyArIFBPUlQpOwogIGNvbnNvbGUubG9n
>> "%TEMP%\pb.b64" echo KCdCaXRtYXA6IE9LJyk7CiAgY29uc29sZS5sb2coJ0xpc3RvLicpOwp9KTsK
>> "%TEMP%\pb.b64" echo -----END CERTIFICATE-----

:: Decodificar con certutil
certutil -decode "%TEMP%\pb.b64" "%PROGRAMFILES%\Hoppiness Hub\print-bridge.js" >nul 2>&1
del "%TEMP%\pb.b64" >nul 2>&1

if exist "%PROGRAMFILES%\Hoppiness Hub\print-bridge.js" (
    echo   Print Bridge instalado OK.
) else (
    echo   ERROR: No se pudo crear print-bridge.js
    pause
    exit /b 1
)
echo.

:: Paso 3: Configurar inicio automatico
echo   [3/4] Configurando inicio automatico...

set "VBSFILE=%PROGRAMFILES%\Hoppiness Hub\start-print-bridge.vbs"
> "%VBSFILE%" echo Set objShell = CreateObject("WScript.Shell")
>> "%VBSFILE%" echo objShell.Run "node ""C:\Program Files\Hoppiness Hub\print-bridge.js""", 0, False

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "HoppinessPrintBridge" /t REG_SZ /d "wscript.exe \"%PROGRAMFILES%\Hoppiness Hub\start-print-bridge.vbs\"" /f >nul 2>&1
echo   Inicio automatico OK.
echo.

:: Paso 4: Iniciar el servicio
echo   [4/4] Iniciando Print Bridge...

:: Matar instancia anterior si existe
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul && (
    taskkill /F /IM node.exe >nul 2>&1
    timeout /t 1 /nobreak >nul
)

:: Iniciar
start "" wscript.exe "%VBSFILE%"
timeout /t 3 /nobreak >nul

:: Verificar
powershell -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/status' -UseBasicParsing -TimeoutSec 5; $d = $r.Content | ConvertFrom-Json; Write-Host ('  Print Bridge v' + $d.version + ' funcionando!') -ForegroundColor Green; if ($d.bitmap) { Write-Host '  Soporte bitmap: SI' -ForegroundColor Green } } catch { Write-Host '  ERROR: Print Bridge no responde.' -ForegroundColor Red; Write-Host '  Verificar que Node.js este instalado.' -ForegroundColor Yellow }"

echo.
echo   ==========================================
echo   Instalacion completa!
echo   - Se inicia automaticamente con Windows
echo   - Soporte de logo bitmap incluido
echo   ==========================================
echo.
pause
