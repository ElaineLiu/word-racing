$root = $PSScriptRoot
$port = if ($args.Count -gt 0) { $args[0] } else { 3000 }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Server started on port $port at $root"
Write-Host "Open http://localhost:$port"

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'application/javascript'
    '.mjs'  = 'application/javascript'
    '.css'  = 'text/css'
    '.json' = 'application/json'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.svg'  = 'image/svg+xml'
    '.woff2'= 'font/woff2'
    '.map'  = 'application/json'
    '.ico'  = 'image/x-icon'
}

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $path = $ctx.Request.Url.LocalPath.TrimStart('/')
    if ($path -eq '') { $path = 'index.html' }
    $fullPath = Join-Path $root $path
    if (Test-Path $fullPath -PathType Leaf) {
        $ext = [IO.Path]::GetExtension($fullPath).ToLower()
        $buf = [IO.File]::ReadAllBytes($fullPath)
        $ctx.Response.ContentType = $mime[$ext]
        if (-not $ctx.Response.ContentType) {
            $ctx.Response.ContentType = 'application/octet-stream'
        }
        $ctx.Response.OutputStream.Write($buf, 0, $buf.Length)
    } else {
        $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
}
