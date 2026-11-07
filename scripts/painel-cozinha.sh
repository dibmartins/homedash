#!/data/data/com.termux/files/usr/bin/bash
# Painel da Família: mantém o painel no Chromecast da cozinha.
# Roda no celular Android velho (Termux). Veja o LEIA-ME.md, seção 5.
#
# Regra: só envia o painel quando o Chromecast está parado (fotos de fundo
# ou nada tocando). Se alguém estiver vendo YouTube, Netflix etc., não mexe.

TV="192.168.0.50"          # IP do Chromecast (app Google Home > dispositivo > configurações > informações)
URL="https://SEU-SITE/index.html?pessoa=familia&api=URL_DO_EXEC&token=SEU_TOKEN"
HORA_INICIO=6              # não envia antes das 6h...
HORA_FIM=22                # ...nem depois das 22h (enviar pode ligar a TV pelo HDMI-CEC)

hora=$(date +%-H)
if [ "$hora" -lt "$HORA_INICIO" ] || [ "$hora" -ge "$HORA_FIM" ]; then
  exit 0
fi

info=$(catt -d "$TV" info 2>&1)

if echo "$info" | grep -qi "dashcast"; then
  exit 0                                   # o painel já está na tela
fi

if [ -z "$info" ] || echo "$info" | grep -qiE "backdrop|idle|not running|no app"; then
  catt -d "$TV" cast_site "$URL" >/dev/null 2>&1
fi
# qualquer outro app (YouTube, Spotify...) está em uso: não interrompe
