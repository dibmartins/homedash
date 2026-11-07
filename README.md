# homedash · Painel da Família

Um painel para TV com relógio, tempo, agenda, lembretes, lista de compras, cardápio da semana e fotos.
Cada pessoa pode ter o seu painel (`pessoa=pessoa1`, `pessoa2`...) e há um painel geral (`pessoa=familia`).

![Prévia do painel com dados de exemplo](docs/previa.png)

## Estrutura

| Pasta | O que tem |
|---|---|
| `web/` | O painel (`index.html`). Abra no navegador para ver com dados de exemplo. Publicado no GitHub Pages a cada mudança na `main`. |
| `apps-script/` | O script do Google Apps Script (`Code.gs` + `appsscript.json`) que lê agenda, tarefas, planilha e fotos. |
| `android/` | App Android TV em Kotlin: um WebView em tela cheia que abre o painel ao ligar a TV. |
| `scripts/` | `manter-painel-chromecast.sh`: mantém o painel num Chromecast sem Google TV a partir de um celular Android com Termux. |

## 1. Planilha da família

Crie uma planilha no Google Sheets chamada "Painel da Família" e compartilhe com quem mora com você para todos editarem pelo celular. Crie três abas, com a primeira linha de títulos:

| Aba | Colunas |
|---|---|
| Compras | Item · Comprado (caixa de seleção) |
| Cardápio | Dia (seg, ter, qua, qui, sex, sáb, dom) · Almoço · Jantar |
| Lembretes | Lembrete · Pessoa (o nome definido em `sheetReminders` ou Todos) · Data · Feito (caixa de seleção) |

Marcou "Comprado" ou "Feito", o item some do painel.

## 2. Script (Google Apps Script)

1. Acesse https://script.google.com, crie um projeto e cole o conteúdo de `apps-script/Code.gs`.
2. Em **Serviços** (+), adicione **Google Tasks API**.
3. No topo do arquivo, preencha `TOKEN` (uma senha aleatória), `SHEET_ID` e os `PROFILES`:
   - **Perfis:** troque `pessoa1`, `pessoa2`... e os nomes pelos da sua casa apenas na sua cópia do script, nunca no repositório.
   - **Agendas:** as agendas das outras pessoas precisam estar compartilhadas com a sua conta. Coloque o e-mail/ID de cada uma em `calendars`.
   - **Lembretes por voz:** "Ok Google, me lembre de..." num alto-falante Google cai no Google Tasks da conta vinculada, na lista "Minhas tarefas".
   - **Fotos:** no Google Fotos, abra o álbum, toque em Compartilhar > Criar link e cole o link em `photos.album`. Se o link parar de funcionar, use uma pasta do Drive em `photos.folder`.
4. Rode a função `teste` uma vez para autorizar e conferir o resultado no log.
5. **Implantar > Nova implantação > App da Web**, executar como "Eu", acesso "Qualquer pessoa". Copie a URL que termina em `/exec`.

## 3. Publicar o painel (GitHub Pages)

O workflow `.github/workflows/pages.yml` publica a pasta `web/` a cada mudança na `main`. Para ativar, em **Settings > Pages**, escolha **Source: GitHub Actions**. Em repositório privado, o GitHub Pages exige o plano GitHub Pro.

O endereço do painel fica assim (o app Android monta isso sozinho):

```
https://dibmartins.github.io/homedash/?pessoa=familia&api=URL_DO_EXEC&token=SEU_TOKEN&lat=LATITUDE&lon=LONGITUDE&cidade=SUA_CIDADE
```

Sem `lat` e `lon`, o quadro do tempo não aparece.

## 4. App Android TV (TVs e sticks com Android TV / Google TV)

O workflow `.github/workflows/android.yml` gera o APK a cada mudança em `android/`. Na `main`, ele também publica o arquivo na release **app-mais-recente**.

**Instalar:**
1. Na TV, instale o app **Downloader** (by AFTVnews) pela Play Store e permita que ele instale apps (Configurações > Segurança > Fontes desconhecidas).
2. Abra o link do APK da release (ou copie o `painel-da-familia.apk` para um pen drive) e instale.
3. Abra o **Painel da Família**. Na primeira vez aparece a configuração: escolha o perfil, cole o endereço `/exec` e o token. O app **Google TV** do celular tem um teclado no controle virtual que aceita colar texto.
4. Marque "Abrir o painel quando a TV ligar". No Android 10 ou mais novo, o app pede a permissão "Sobrepor a outros apps", necessária para abrir sozinho. Se a TV não mostrar essa tela, ative pelo computador: `adb shell appops set br.com.homedash SYSTEM_ALERT_WINDOW allow`.

**No controle:** toque curto no OK recarrega o painel. Segure o OK (ou aperte MENU) para voltar à configuração.

**Assinatura:** para que cada versão nova instale por cima da anterior, cadastre os segredos `HOMEDASH_KEYSTORE_BASE64`, `HOMEDASH_KEYSTORE_PASSWORD`, `HOMEDASH_KEY_ALIAS` e `HOMEDASH_KEY_PASSWORD` em **Settings > Secrets and variables > Actions**. Sem eles, o APK sai com a chave de debug.

**Alternativa sem app:** o **Fully Kiosk Browser** (Play Store) também funciona: cole o endereço do painel em Web Content e ative "Start on Boot" e "Keep Screen On".

## 5. Chromecast sem Google TV (modelos antigos)

Esse modelo só exibe o que é enviado a ele. Há dois caminhos:

**Recomendado: um celular Android antigo como "controle" sempre ligado**

O celular fica na tomada, no Wi-Fi de casa, e a cada 5 minutos confere o Chromecast. Se ele estiver parado (nas fotos de fundo), envia o painel. Se alguém estiver vendo YouTube, não interrompe. À noite não envia nada.

1. No celular, instale o **F-Droid** (f-droid.org) e, por ele, o **Termux** e o **Termux:Boot**. A versão do Termux da Play Store está desatualizada.
2. Abra o Termux:Boot uma vez (para ele ser ativado).
3. Nas configurações do Android, tire o Termux da otimização de bateria (Apps > Termux > Bateria > Sem restrições).
4. No Termux, rode:
   ```
   pkg update && pkg install python cronie termux-api
   pip install catt
   ```
5. Copie o `scripts/manter-painel-chromecast.sh` para o celular, edite o IP do Chromecast e a URL do painel, e instale:
   ```
   mkdir -p ~/bin ~/.termux/boot
   cp manter-painel-chromecast.sh ~/bin/ && chmod +x ~/bin/manter-painel-chromecast.sh
   (crontab -l 2>/dev/null; echo "*/5 * * * * ~/bin/manter-painel-chromecast.sh") | crontab -
   printf '#!/data/data/com.termux/files/usr/bin/sh\ntermux-wake-lock\ncrond\n' > ~/.termux/boot/start.sh
   chmod +x ~/.termux/boot/start.sh
   ```
6. Reinicie o celular. Teste rodando `~/bin/manter-painel-chromecast.sh` com a TV parada nas fotos.

Dica: reserve um IP fixo para o Chromecast nas configurações do roteador, senão o IP pode mudar e o script deixa de encontrá-lo.

**Alternativa em um computador ou Raspberry Pi:** de um computador ou Raspberry Pi na mesma rede, instale o `catt` (`pip install catt`) e rode:

```
catt -d "NOME_DO_CHROMECAST" cast_site "URL_DO_PAINEL"
```

Para manter sempre ligado, agende esse comando a cada 15 minutos (cron) em um aparelho que fique ligado.

**B. App receptor próprio:** cadastre-se no Google Cast SDK Developer Console (taxa única de US$ 5), crie um "Custom Receiver" com a URL do painel e registre o número de série do Chromecast para teste. O painel já detecta que está num Chromecast e desliga o tempo limite de inatividade.

Se alguém transmitir YouTube ou outra coisa, o painel sai e volta no próximo envio.

## Segurança

- **A página do painel não guarda nenhum segredo.** O token vai só no endereço que você configura em cada TV. Não coloque o token no repositório.
- **O script é somente leitura.** O arquivo `appsscript.json` limita as permissões a ler agenda, tarefas, planilha e Drive. Ele não consegue apagar, alterar, enviar e-mail nem mexer na sua senha. Para usá-lo, no editor do Apps Script ative "Mostrar o arquivo de manifesto appsscript.json" (Configurações do projeto) e cole o conteúdo.
- **Quem tiver o endereço `/exec` e o token consegue ver o que aparece no painel**, e nada além disso. Use um token longo e aleatório (o script recusa tokens com menos de 24 caracteres). Se desconfiar de vazamento, troque o `TOKEN` e implante de novo.
- **Eventos marcados como "Particular"** no Google Agenda aparecem só como "Ocupado".
- **Fotos do Drive:** o script só entrega fotos das pastas configuradas, nunca outros arquivos.
- Ative a verificação em duas etapas na conta Google, se ainda não estiver ativa.
