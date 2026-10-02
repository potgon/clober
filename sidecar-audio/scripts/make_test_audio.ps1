# Regenerates tests/data/*.wav with the Windows es-ES voice (16 kHz, 16-bit, mono).
Add-Type -AssemblyName System.Speech
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$out = Join-Path $PSScriptRoot "..\tests\data\escena_juego.wav"
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::NotSet, [System.Speech.Synthesis.VoiceAge]::NotSet, 0, [System.Globalization.CultureInfo]::GetCultureInfo("es-ES"))
$s.SetOutputToWaveFile($out, $fmt)
$p = New-Object System.Speech.Synthesis.PromptBuilder
$p.AppendBreak([TimeSpan]::FromMilliseconds(600))
$p.AppendText("Pon la escena juego.")
$p.AppendBreak([TimeSpan]::FromMilliseconds(900))
$s.Speak($p)
$s.Dispose()
