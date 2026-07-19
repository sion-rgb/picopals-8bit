Add-Type -AssemblyName System.Drawing
$out = Join-Path (Split-Path $PSScriptRoot -Parent) "public\icons"
New-Item -ItemType Directory -Force -Path $out | Out-Null
function New-PicoIcon([int]$size,[string]$name,[bool]$maskable=$false) {
  $bmp = New-Object System.Drawing.Bitmap($size,$size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml($(if($maskable){"#d989b5"}else{"#fff8f3"})))
  $unit=[Math]::Floor($size/16); $ox=[Math]::Floor(($size-$unit*16)/2)
  $pink=New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#d989b5")); $dark=New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#49384d")); $cream=New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#fff3bd")); $white=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $g.FillRectangle($dark,$ox+$unit*4,$ox+$unit*2,$unit*8,$unit*12)
  $g.FillRectangle($pink,$ox+$unit*3,$ox+$unit*4,$unit*10,$unit*8)
  $g.FillRectangle($cream,$ox+$unit*5,$ox+$unit*3,$unit*6,$unit*10)
  $g.FillRectangle($dark,$ox+$unit*6,$ox+$unit*7,$unit,$unit*2); $g.FillRectangle($dark,$ox+$unit*9,$ox+$unit*7,$unit,$unit*2)
  $g.FillRectangle($pink,$ox+$unit*7,$ox+$unit*10,$unit*2,$unit)
  $g.FillRectangle($white,$ox+$unit*2,$ox+$unit*2,$unit,$unit); $g.FillRectangle($white,$ox+$unit*13,$ox+$unit*3,$unit,$unit); $g.FillRectangle($white,$ox+$unit*12,$ox+$unit*1,$unit,$unit)
  $bmp.Save((Join-Path $out $name),[System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose();$bmp.Dispose();$pink.Dispose();$dark.Dispose();$cream.Dispose();$white.Dispose()
}
New-PicoIcon 192 "icon-192.png"
New-PicoIcon 512 "icon-512.png"
New-PicoIcon 512 "icon-maskable-512.png" $true
New-PicoIcon 180 "apple-touch-icon.png"
