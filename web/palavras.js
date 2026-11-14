// Palavras em inglês para a tela de vocabulário, por nível. Cada item: palavra:tradução:classe
// (n = substantivo, v = verbo, a = adjetivo, r = advérbio). A classe escolhe o significado certo no dicionário.
// O painel mostra 3 por dia, na ordem da lista, de segunda a sábado; no domingo, revê as da semana.
// Quando a lista acaba, começa de novo (rever ajuda a fixar).
window.PALAVRAS = {
  basico:
    "apple:maçã:n;house:casa:n;dog:cachorro:n;book:livro:n;water:água:n;tree:árvore:n;bread:pão:n;chair:cadeira:n;" +
    "window:janela:n;door:porta:n;bird:pássaro:n;fish:peixe:n;flower:flor:n;sun:sol:n;moon:lua:n;star:estrela:n;" +
    "cloud:nuvem:n;rain:chuva:n;snow:neve:n;wind:vento:n;river:rio:n;mountain:montanha:n;beach:praia:n;island:ilha:n;" +
    "car:carro:n;bus:ônibus:n;train:trem:n;bicycle:bicicleta:n;boat:barco:n;airplane:avião:n;road:estrada:n;bridge:ponte:n;" +
    "kitchen:cozinha:n;bedroom:quarto:n;bathroom:banheiro:n;garden:jardim:n;table:mesa:n;bed:cama:n;lamp:luminária:n;mirror:espelho:n;" +
    "spoon:colher:n;fork:garfo:n;knife:faca:n;plate:prato:n;cup:xícara:n;glass:copo:n;bottle:garrafa:n;bowl:tigela:n;" +
    "milk:leite:n;cheese:queijo:n;egg:ovo:n;rice:arroz:n;beans:feijão:n;meat:carne:n;chicken:frango:n;soup:sopa:n;" +
    "banana:banana:n;orange:laranja:n;grape:uva:n;strawberry:morango:n;lemon:limão:n;watermelon:melancia:n;pineapple:abacaxi:n;carrot:cenoura:n;" +
    "potato:batata:n;tomato:tomate:n;onion:cebola:n;corn:milho:n;cake:bolo:n;cookie:biscoito:n;honey:mel:n;salt:sal:n;" +
    "cat:gato:n;horse:cavalo:n;cow:vaca:n;pig:porco:n;sheep:ovelha:n;duck:pato:n;rabbit:coelho:n;mouse:rato:n;" +
    "lion:leão:n;tiger:tigre:n;elephant:elefante:n;monkey:macaco:n;bear:urso:n;snake:cobra:n;frog:sapo:n;turtle:tartaruga:n;" +
    "butterfly:borboleta:n;bee:abelha:n;ant:formiga:n;spider:aranha:n;whale:baleia:n;shark:tubarão:n;owl:coruja:n;penguin:pinguim:n;" +
    "head:cabeça:n;hand:mão:n;foot:pé:n;eye:olho:n;ear:orelha:n;nose:nariz:n;mouth:boca:n;tooth:dente:n;" +
    "hair:cabelo:n;arm:braço:n;leg:perna:n;knee:joelho:n;shoulder:ombro:n;heart:coração:n;finger:dedo:n;face:rosto:n;" +
    "shirt:camisa:n;shoes:sapatos:n;hat:chapéu:n;dress:vestido:n;jacket:jaqueta:n;socks:meias:n;umbrella:guarda-chuva:n;bag:bolsa:n;" +
    "school:escola:n;teacher:professor:n;student:aluno:n;pencil:lápis:n;notebook:caderno:n;clock:relógio:n;key:chave:n;phone:telefone:n;" +
    "ball:bola:n;kite:pipa:n;doll:boneca:n;game:jogo:n;song:música:n;picture:foto:n;letter:carta:n;gift:presente:n;" +
    "family:família:n;mother:mãe:n;father:pai:n;brother:irmão:n;sister:irmã:n;baby:bebê:n;friend:amigo:n;grandmother:avó:n;" +
    "doctor:médico:n;farmer:fazendeiro:n;firefighter:bombeiro:n;cook:cozinheiro:n;city:cidade:n;street:rua:n;shop:loja:n;market:mercado:n;" +
    "hospital:hospital:n;church:igreja:n;park:parque:n;library:biblioteca:n;money:dinheiro:n;morning:manhã:n;night:noite:n;week:semana:n;" +
    "eat:comer:v;drink:beber:v;sleep:dormir:v;run:correr:v;walk:andar:v;jump:pular:v;swim:nadar:v;fly:voar:v;" +
    "read:ler:v;write:escrever:v;sing:cantar:v;dance:dançar:v;play:brincar:v;wash:lavar:v;open:abrir:v;" +
    "close:fechar:v;sit:sentar:v;stand:ficar de pé:v;listen:ouvir:v;speak:falar:v;smile:sorrir:v;cry:chorar:v;laugh:rir:v;" +
    "help:ajudar:v;give:dar:v;take:pegar:v;buy:comprar:v;sell:vender:v;climb:escalar:v;draw:desenhar:v;paint:pintar:v;" +
    "throw:jogar:v;catch:pegar:v;push:empurrar:v;pull:puxar:v;carry:carregar:v;build:construir:v;wipe:enxugar:v;learn:aprender:v;" +
    "big:grande:a;small:pequeno:a;hot:quente:a;cold:frio:a;happy:feliz:a;sad:triste:a;fast:rápido:a;slow:lento:a;" +
    "tall:alto:a;short:baixo:a;new:novo:a;old:velho:a;clean:limpo:a;dirty:sujo:a;full:cheio:a;empty:vazio:a;" +
    "heavy:pesado:a;light:leve:a;wet:molhado:a;dry:seco:a;hungry:com fome:a;thirsty:com sede:a;tired:cansado:a;angry:bravo:a;" +
    "beautiful:bonito:a;loud:barulhento:a;quiet:silencioso:a;soft:macio:a;hard:duro:a;sweet:doce:a;sour:azedo:a;round:redondo:a",

  intermediario:
    "achieve:conquistar:v;avoid:evitar:v;borrow:pegar emprestado:v;complain:reclamar:v;decide:decidir:v;deliver:entregar:v;describe:descrever:v;enjoy:aproveitar:v;" +
    "explain:explicar:v;forgive:perdoar:v;guess:adivinhar:v;improve:melhorar:v;invite:convidar:v;mention:mencionar:v;notice:perceber:v;offer:oferecer:v;" +
    "persuade:convencer:v;prevent:prevenir:v;promise:prometer:v;protect:proteger:v;realize:perceber:v;recommend:recomendar:v;refuse:recusar:v;remind:lembrar:v;" +
    "repair:consertar:v;replace:substituir:v;require:exigir:v;suggest:sugerir:v;support:apoiar:v;surround:cercar:v;threaten:ameaçar:v;wander:vagar:v;" +
    "whisper:sussurrar:v;yell:gritar:v;shrug:dar de ombros:v;sneeze:espirrar:v;yawn:bocejar:v;wrap:embrulhar:v;pour:despejar:v;spill:derramar:v;" +
    "stir:mexer:v;chop:picar:v;boil:ferver:v;bake:assar:v;fry:fritar:v;peel:descascar:v;squeeze:espremer:v;taste:provar:v;" +
    "measure:medir:v;weigh:pesar:v;fold:dobrar:v;hang:pendurar:v;tie:amarrar:v;sew:costurar:v;knock:bater:v;shake:sacudir:v;" +
    "bend:dobrar:v;lean:inclinar-se:v;crawl:engatinhar:v;kneel:ajoelhar-se:v;stretch:alongar:v;breathe:respirar:v;blink:piscar:v;frown:franzir a testa:v;" +
    "hug:abraçar:v;wave:acenar:v;nod:acenar com a cabeça:v;bite:morder:v;chew:mastigar:v;swallow:engolir:v;lick:lamber:v;scratch:coçar:v;" +
    "hide:esconder:v;seek:procurar:v;chase:perseguir:v;escape:escapar:v;rescue:resgatar:v;explore:explorar:v;discover:descobrir:v;invent:inventar:v;" +
    "grow:crescer:v;shrink:encolher:v;melt:derreter:v;freeze:congelar:v;burn:queimar:v;float:flutuar:v;sail:velejar:v;bounce:quicar:v;" +
    "rely:depender:v;afford:ter condições de pagar:v;admire:admirar:v;apologize:pedir desculpas:v;argue:discutir:v;arrange:organizar:v;attend:comparecer:v;behave:comportar-se:v;" +
    "celebrate:comemorar:v;compare:comparar:v;encourage:encorajar:v;expect:esperar:v;hesitate:hesitar:v;imagine:imaginar:v;intend:pretender:v;manage:conseguir:v;" +
    "pretend:fingir:v;remain:permanecer:v;succeed:ter sucesso:v;wonder:perguntar-se:v;worry:preocupar-se:v;struggle:batalhar:v;postpone:adiar:v;overcome:superar:v;" +
    "ladder:escada de mão:n;bucket:balde:n;broom:vassoura:n;hammer:martelo:n;nail:prego:n;screw:parafuso:n;rope:corda:n;chain:corrente:n;" +
    "drawer:gaveta:n;shelf:prateleira:n;blanket:cobertor:n;pillow:travesseiro:n;sheet:lençol:n;towel:toalha:n;sink:pia:n;faucet:torneira:n;" +
    "stove:fogão:n;oven:forno:n;fridge:geladeira:n;kettle:chaleira:n;pan:frigideira:n;pot:panela:n;lid:tampa:n;tray:bandeja:n;" +
    "basement:porão:n;attic:sótão:n;roof:telhado:n;wall:parede:n;floor:chão:n;ceiling:teto:n;stairs:escada:n;fence:cerca:n;" +
    "neighbor:vizinho:n;stranger:estranho:n;guest:convidado:n;crowd:multidão:n;journey:viagem:n;luggage:bagagem:n;passport:passaporte:n;ticket:passagem:n;" +
    "receipt:recibo:n;bill:conta:n;discount:desconto:n;bargain:pechincha:n;wage:salário:n;debt:dívida:n;loan:empréstimo:n;savings:economias:n;" +
    "skill:habilidade:n;goal:objetivo:n;habit:hábito:n;mistake:erro:n;advice:conselho:n;opinion:opinião:n;reason:motivo:n;choice:escolha:n;" +
    "attempt:tentativa:n;effort:esforço:n;knowledge:conhecimento:n;memory:memória:n;dream:sonho:n;fear:medo:n;pride:orgulho:n;shame:vergonha:n;" +
    "thunder:trovão:n;lightning:relâmpago:n;storm:tempestade:n;fog:neblina:n;rainbow:arco-íris:n;breeze:brisa:n;drought:seca:n;flood:enchente:n;" +
    "forest:floresta:n;desert:deserto:n;valley:vale:n;cave:caverna:n;lake:lago:n;waterfall:cachoeira:n;volcano:vulcão:n;coast:litoral:n;" +
    "seed:semente:n;root:raiz:n;leaf:folha:n;branch:galho:n;bark:casca de árvore:n;thorn:espinho:n;mushroom:cogumelo:n;pumpkin:abóbora:n;" +
    "squirrel:esquilo:n;fox:raposa:n;wolf:lobo:n;deer:cervo:n;eagle:águia:n;parrot:papagaio:n;bat:morcego:n;snail:caracol:n;" +
    "brave:corajoso:a;shy:tímido:a;lazy:preguiçoso:a;polite:educado:a;rude:grosseiro:a;proud:orgulhoso:a;jealous:ciumento:a;honest:honesto:a;" +
    "generous:generoso:a;selfish:egoísta:a;curious:curioso:a;careful:cuidadoso:a;careless:descuidado:a;patient:paciente:a;anxious:ansioso:a;grateful:grato:a;" +
    "awkward:constrangedor:a;bored:entediado:a;confused:confuso:a;embarrassed:envergonhado:a;exhausted:exausto:a;excited:animado:a;scared:assustado:a;relieved:aliviado:a;" +
    "crowded:lotado:a;narrow:estreito:a;wide:largo:a;deep:fundo:a;shallow:raso:a;steep:íngreme:a;smooth:liso:a;rough:áspero:a;" +
    "bright:brilhante:a;dim:fraco:a;sharp:afiado:a;blunt:sem corte:a;tight:apertado:a;loose:solto:a;fragile:frágil:a;sturdy:resistente:a;" +
    "cheap:barato:a;expensive:caro:a;rare:raro:a;common:comum:a;ancient:antigo:a;modern:moderno:a;huge:enorme:a;tiny:minúsculo:a;" +
    "delicious:delicioso:a;spicy:apimentado:a;bitter:amargo:a;salty:salgado:a;raw:cru:a;ripe:maduro:a;fresh:fresco:a;stale:velho:a;" +
    "almost:quase:r;already:já:r;always:sempre:r;anyway:de qualquer forma:r;barely:mal:r;quickly:rapidamente:r;slowly:devagar:r;suddenly:de repente:r;" +
    "nearly:quase:r;rarely:raramente:r;seldom:raramente:r;soon:logo:r;together:juntos:r;usually:geralmente:r;eventually:finalmente:r;actually:na verdade:r",

  avancado:
    "serendipity:feliz acaso:n;nostalgia:nostalgia:n;resilience:resiliência:n;ambiguity:ambiguidade:n;dilemma:dilema:n;paradox:paradoxo:n;epiphany:revelação:n;nuance:nuance:n;" +
    "hindsight:retrospectiva:n;foresight:previsão:n;insight:percepção:n;leverage:vantagem:n;bias:viés:n;consensus:consenso:n;integrity:integridade:n;empathy:empatia:n;" +
    "milestone:marco:n;threshold:limiar:n;bottleneck:gargalo:n;loophole:brecha:n;outcome:resultado:n;drawback:desvantagem:n;setback:revés:n;breakthrough:avanço:n;" +
    "scrutiny:escrutínio:n;leeway:margem:n;hurdle:obstáculo:n;stalemate:impasse:n;trade-off:compensação:n;backlash:reação negativa:n;upheaval:reviravolta:n;turmoil:tumulto:n;" +
    "whim:capricho:n;grudge:rancor:n;hunch:palpite:n;knack:jeito:n;gist:essência:n;fluke:sorte:n;glimpse:vislumbre:n;wit:perspicácia:n;" +
    "solace:consolo:n;remorse:remorso:n;awe:admiração:n;dread:pavor:n;zeal:zelo:n;wrath:ira:n;bliss:felicidade plena:n;angst:angústia:n;" +
    "plight:situação difícil:n;quandary:dilema:n;predicament:apuro:n;ordeal:provação:n;havoc:estrago:n;mayhem:caos:n;clutter:bagunça:n;debris:destroços:n;" +
    "lighthouse:farol:n;haystack:palheiro:n;scaffolding:andaime:n;wheelbarrow:carrinho de mão:n;anvil:bigorna:n;compass:bússola:n;hourglass:ampulheta:n;telescope:telescópio:n;" +
    "quill:pena de escrever:n;scroll:pergaminho:n;lantern:lanterna:n;chandelier:lustre:n;cobblestone:paralelepípedo:n;meadow:prado:n;orchard:pomar:n;marsh:pântano:n;" +
    "cliff:penhasco:n;ridge:cume:n;gorge:desfiladeiro:n;glacier:geleira:n;tide:maré:n;dune:duna:n;reef:recife:n;whirlpool:redemoinho:n;" +
    "pebble:pedrinha:n;boulder:rochedo:n;twig:graveto:n;acorn:bolota:n;moss:musgo:n;ivy:hera:n;blossom:florescência:n;bud:broto:n;" +
    "puddle:poça:n;drizzle:garoa:n;hail:granizo:n;frost:geada:n;dusk:crepúsculo:n;dawn:amanhecer:n;twilight:lusco-fusco:n;eclipse:eclipse:n;" +
    "hedgehog:ouriço:n;beaver:castor:n;otter:lontra:n;moth:mariposa:n;firefly:vaga-lume:n;dragonfly:libélula:n;hummingbird:beija-flor:n;woodpecker:pica-pau:n;" +
    "seagull:gaivota:n;swan:cisne:n;stork:cegonha:n;vulture:abutre:n;raccoon:guaxinim:n;sloth:bicho-preguiça:n;armadillo:tatu:n;jellyfish:água-viva:n;" +
    "mitigate:atenuar:v;alleviate:aliviar:v;undermine:minar:v;bolster:reforçar:v;thrive:prosperar:v;flourish:florescer:v;linger:demorar-se:v;dwindle:diminuir:v;" +
    "ponder:ponderar:v;contemplate:contemplar:v;deem:considerar:v;discern:discernir:v;foster:promover:v;nurture:nutrir:v;cherish:estimar:v;relish:saborear:v;" +
    "embrace:abraçar:v;endure:suportar:v;withstand:resistir:v;persevere:perseverar:v;procrastinate:procrastinar:v;dawdle:enrolar:v;loiter:vadiar:v;meander:serpentear:v;" +
    "scrutinize:examinar:v;emphasize:enfatizar:v;convey:transmitir:v;elaborate:detalhar:v;clarify:esclarecer:v;imply:insinuar:v;infer:deduzir:v;allude:aludir:v;" +
    "comply:cumprir:v;concede:admitir:v;yield:ceder:v;relinquish:abrir mão:v;forfeit:perder o direito:v;renounce:renunciar:v;abstain:abster-se:v;refrain:abster-se:v;" +
    "deceive:enganar:v;betray:trair:v;flatter:bajular:v;coax:persuadir:v;cajole:adular:v;nag:importunar:v;scold:repreender:v;reprimand:repreender:v;" +
    "stumble:tropeçar:v;tumble:cair:v;stagger:cambalear:v;tiptoe:andar na ponta dos pés:v;sprint:disparar:v;stroll:passear:v;trudge:caminhar com esforço:v;hike:fazer trilha:v;" +
    "gaze:contemplar:v;glance:dar uma olhada:v;stare:encarar:v;peek:espiar:v;squint:apertar os olhos:v;gawk:olhar boquiaberto:v;eavesdrop:bisbilhotar:v;mumble:murmurar:v;" +
    "crumble:desmoronar:v;shatter:estilhaçar:v;dangle:balançar:v;sway:oscilar:v;flicker:tremeluzir:v;glisten:reluzir:v;sparkle:cintilar:v;ripple:ondular:v;" +
    "simmer:cozinhar em fogo baixo:v;sizzle:chiar:v;knead:sovar:v;whisk:bater:v;grate:ralar:v;sprinkle:polvilhar:v;marinate:marinar:v;garnish:decorar:v;" +
    "ubiquitous:onipresente:a;ephemeral:efêmero:a;meticulous:meticuloso:a;pragmatic:pragmático:a;resilient:resiliente:a;tenacious:tenaz:a;diligent:diligente:a;frugal:econômico:a;" +
    "eloquent:eloquente:a;articulate:articulado:a;candid:franco:a;outspoken:franco:a;tactful:diplomático:a;aloof:distante:a;wary:desconfiado:a;gullible:ingênuo:a;" +
    "elusive:evasivo:a;obscure:obscuro:a;vague:vago:a;subtle:sutil:a;blatant:descarado:a;conspicuous:chamativo:a;feasible:viável:a;viable:viável:a;" +
    "versatile:versátil:a;robust:robusto:a;cumbersome:incômodo:a;tedious:tedioso:a;mundane:mundano:a;quaint:pitoresco:a;cozy:aconchegante:a;bleak:sombrio:a;" +
    "lavish:luxuoso:a;scarce:escasso:a;abundant:abundante:a;vast:vasto:a;immense:imenso:a;minute:minúsculo:a;brittle:quebradiço:a;sleek:elegante:a;" +
    "reluctant:relutante:a;eager:ansioso:a;keen:entusiasmado:a;wistful:melancólico:a;elated:radiante:a;forlorn:desamparado:a;smug:convencido:a;sheepish:encabulado:a;" +
    "witty:espirituoso:a;whimsical:caprichoso:a;quirky:peculiar:a;earnest:sincero:a;stubborn:teimoso:a;fickle:volúvel:a;humble:humilde:a;arrogant:arrogante:a;" +
    "vivid:vívido:a;serene:sereno:a;tranquil:tranquilo:a;rugged:acidentado:a;lush:exuberante:a;barren:árido:a;murky:turvo:a;pristine:imaculado:a;" +
    "inevitable:inevitável:a;imminent:iminente:a;spontaneous:espontâneo:a;deliberate:deliberado:a;tentative:provisório:a;intricate:complexo:a;profound:profundo:a;trivial:trivial:a;" +
    "arguably:possivelmente:r;inherently:intrinsecamente:r;seemingly:aparentemente:r;reluctantly:relutantemente:r;thoroughly:minuciosamente:r;merely:meramente:r;hence:portanto:r;nonetheless:mesmo assim:r;" +
    "likewise:da mesma forma:r;readily:prontamente:r;scarcely:mal:r;utterly:completamente:r;vividly:vividamente:r;wholeheartedly:de todo o coração:r;furthermore:além disso:r;meanwhile:enquanto isso:r"
};
