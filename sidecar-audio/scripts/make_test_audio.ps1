# Regenerates tests/data/*.wav with Windows voices (16 kHz, 16-bit, mono).
# Needs the es-ES (Helena) and en-US (Zira) voices that ship with Windows.
Add-Type -AssemblyName System.Speech
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$data = Join-Path $PSScriptRoot "..\tests\data"

function Write-Wav($name, [scriptblock]$build) {
    $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $s.SetOutputToWaveFile((Join-Path $data $name), $fmt)
    $p = New-Object System.Speech.Synthesis.PromptBuilder
    & $build $p
    $s.Speak($p)
    $s.Dispose()
}

Write-Wav "escena_juego.wav" {
    param($p)
    $p.StartVoice("Microsoft Helena Desktop")
    $p.AppendBreak([TimeSpan]::FromMilliseconds(600))
    $p.AppendText("Pon la escena juego.")
    $p.AppendBreak([TimeSpan]::FromMilliseconds(900))
    $p.EndVoice()
}

# Placeholder wake word (hey_jarvis, F0.7) followed by a command.
Write-Wav "hey_jarvis_escena_juego.wav" {
    param($p)
    $p.AppendBreak([TimeSpan]::FromMilliseconds(600))
    $p.StartVoice("Microsoft Zira Desktop")
    $p.AppendText("Hey Jarvis.")
    $p.EndVoice()
    $p.AppendBreak([TimeSpan]::FromMilliseconds(300))
    $p.StartVoice("Microsoft Helena Desktop")
    $p.AppendText("Pon la escena juego.")
    $p.EndVoice()
    $p.AppendBreak([TimeSpan]::FromMilliseconds(900))
}
