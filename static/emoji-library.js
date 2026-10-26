// ==================== COMPREHENSIVE EMOJI LIBRARY ====================
// Provides an extensive searchable, categorized library of emojis with
// optional integration for the 'emoji-picker-element' web component library.

(function () {
    const EMOJI_CATEGORIES = [
        { id: 'all', label: 'All', icon: '✨' },
        { id: 'tech', label: 'Tech & Dev', icon: '💻' },
        { id: 'security', label: 'Security & Keys', icon: '🔒' },
        { id: 'finance', label: 'Finance & Money', icon: '💳' },
        { id: 'gaming', label: 'Gaming & Media', icon: '🎮' },
        { id: 'social', label: 'Social & Web', icon: '🌐' },
        { id: 'work', label: 'Work & Office', icon: '💼' },
        { id: 'smileys', label: 'Smileys & People', icon: '😀' },
        { id: 'travel', label: 'Travel & Places', icon: '✈️' },
        { id: 'objects', label: 'Objects & Tools', icon: '⚡' },
        { id: 'nature', label: 'Nature & Food', icon: '🍀' }
    ];

    const EMOJI_ITEMS = [
        // Tech & Dev
        { e: '💻', n: 'laptop computer tech macbook coding', c: 'tech' },
        { e: '🖥️', n: 'desktop pc screen monitor imac workstation', c: 'tech' },
        { e: '⌨️', n: 'keyboard typing mechanical code', c: 'tech' },
        { e: '🖱️', n: 'mouse click trackpad cursor', c: 'tech' },
        { e: '📱', n: 'mobile phone smartphone iphone android app', c: 'tech' },
        { e: '📲', n: 'phone call mobile incoming call', c: 'tech' },
        { e: '💾', n: 'floppy disk save storage backup', c: 'tech' },
        { e: '💿', n: 'cd optical disc dvd storage', c: 'tech' },
        { e: '📀', n: 'dvd disc optical drive media', c: 'tech' },
        { e: '🖨️', n: 'printer printing document paper', c: 'tech' },
        { e: '🔌', n: 'electric plug power adapter cable connect', c: 'tech' },
        { e: '🔋', n: 'battery energy charge power cell', c: 'tech' },
        { e: '📡', n: 'satellite dish antenna signal wifi network', c: 'tech' },
        { e: '⚙️', n: 'gear settings config options preferences system', c: 'tech' },
        { e: '🔧', n: 'wrench fix repair tools devops admin', c: 'tech' },
        { e: '🔨', n: 'hammer build construct tool dev', c: 'tech' },
        { e: '🛠️', n: 'tools hammer wrench maintenance configure', c: 'tech' },
        { e: '📦', n: 'package npm cargo box docker shipping build', c: 'tech' },
        { e: '🤖', n: 'robot ai bot automation machine learning', c: 'tech' },
        { e: '🧠', n: 'brain neural intelligence ai deep learning', c: 'tech' },
        { e: '🚀', n: 'rocket launch deploy deployment ship release speed', c: 'tech' },
        { e: '☁️', n: 'cloud devops aws azure cloudflare hosting server', c: 'tech' },
        { e: '🌐', n: 'globe web internet network dns url', c: 'tech' },
        { e: '🧬', n: 'dna code science algorithm data structure', c: 'tech' },
        { e: '📊', n: 'bar chart analytics dashboard stats metrics', c: 'tech' },
        { e: '📈', n: 'chart increasing growth analytics trends', c: 'tech' },
        { e: '📉', n: 'chart decreasing drop trend stats', c: 'tech' },
        { e: '🧮', n: 'abacus math calculate algorithm logic', c: 'tech' },
        { e: '💡', n: 'light bulb idea innovation tip spark', c: 'tech' },
        { e: '🔍', n: 'magnifying glass search inspect query find', c: 'tech' },
        { e: '🔎', n: 'search query filter find lookup', c: 'tech' },
        { e: '🔬', n: 'microscope research debug inspect analyze test', c: 'tech' },
        { e: '🧪', n: 'test tube experiment unit test qa staging', c: 'tech' },
        { e: '🧰', n: 'toolbox utility devkit sdk framework', c: 'tech' },
        { e: '📟', n: 'pager beeper devops oncall alert notify', c: 'tech' },

        // Security & Keys
        { e: '🔒', n: 'lock locked secure private encryption password vault', c: 'security' },
        { e: '🔓', n: 'unlock open unlocked decrypt access', c: 'security' },
        { e: '🔑', n: 'key api token credential password access passkey', c: 'security' },
        { e: '🗝️', n: 'old key master key secret vintage private', c: 'security' },
        { e: '🛡️', n: 'shield firewall antivirus defense protection guard', c: 'security' },
        { e: '🔏', n: 'pen lock signature encrypted signed auth ssl', c: 'security' },
        { e: '🔐', n: 'key lock closed credential 2fa totp', c: 'security' },
        { e: '🕵️', n: 'detective secret incognito private spy audit inspect', c: 'security' },
        { e: '🚨', n: 'police siren emergency alert breach breach critical', c: 'security' },
        { e: '⚠️', n: 'warning alert caution hazard risk attention', c: 'security' },
        { e: '🛑', n: 'stop sign block deny firewall forbidden', c: 'security' },
        { e: '🛂', n: 'passport control auth authorization identity kyc', c: 'security' },
        { e: '👁️', n: 'eye view see witness monitor observe privacy', c: 'security' },
        { e: '🙈', n: 'see no evil hidden password hidden masked private', c: 'security' },
        { e: '🧱', n: 'bricks wall firewall barrier protection', c: 'security' },
        { e: '📜', n: 'scroll license terms cert certificate legal', c: 'security' },
        { e: '⚖️', n: 'balance scale compliance legal audit governance', c: 'security' },
        { e: '🎫', n: 'ticket token coupon access auth voucher', c: 'security' },
        { e: '🏷️', n: 'label tag category meta badge identifier', c: 'security' },
        { e: '⚡', n: 'lightning bolt fast argon2 instant auth electric', c: 'security' },
        { e: '🪪', n: 'id card identification identity license credentials', c: 'security' },

        // Finance & Money
        { e: '💳', n: 'credit card debit banking visa mastercard stripe pay', c: 'finance' },
        { e: '💰', n: 'money bag cash funds investment wealth bank', c: 'finance' },
        { e: '💵', n: 'dollar bill cash money salary payment currency', c: 'finance' },
        { e: '🪙', n: 'coin crypto bitcoin btc eth token currency gold', c: 'finance' },
        { e: '🏦', n: 'bank central bank building finance wire transfer', c: 'finance' },
        { e: '💎', n: 'gem diamond luxury valuable crypto token premium', c: 'finance' },
        { e: '🛒', n: 'shopping cart ecommerce store amazon order buy checkout', c: 'finance' },
        { e: '🛍️', n: 'shopping bags retail boutique purchases store', c: 'finance' },
        { e: '🧾', n: 'receipt invoice expense taxes statement bill', c: 'finance' },
        { e: '💸', n: 'flying money transfer spend expenses loss outgoing', c: 'finance' },
        { e: '💹', n: 'yen market chart bullish stock trade profit', c: 'finance' },
        { e: '🏧', n: 'atm cash machine withdrawal bank', c: 'finance' },
        { e: '💲', n: 'dollar sign heavy currency usd pricing', c: 'finance' },
        { e: '💱', n: 'currency exchange forex trading rate swap', c: 'finance' },
        { e: '💶', n: 'euro bill cash european currency money', c: 'finance' },
        { e: '💷', n: 'pound bill cash uk british currency money', c: 'finance' },
        { e: '🎁', n: 'gift box present reward bonus subscription perk', c: 'finance' },

        // Gaming & Media
        { e: '🎮', n: 'video game gamepad controller console steam playstation xbox', c: 'gaming' },
        { e: '🕹️', n: 'joystick arcade retro gaming simulator', c: 'gaming' },
        { e: '🎲', n: 'game die dice random gambling rpg boardgame', c: 'gaming' },
        { e: '🎯', n: 'target bullseye goal objective dart mission', c: 'gaming' },
        { e: '♟️', n: 'chess pawn strategy logic tactics board game', c: 'gaming' },
        { e: '🎬', n: 'clapper board movie film cinema director video hollywood', c: 'gaming' },
        { e: '🎥', n: 'movie camera film video stream recording studio', c: 'gaming' },
        { e: '📺', n: 'television tv monitor netflix display broadcast stream', c: 'gaming' },
        { e: '🎧', n: 'headphones music audio podcast sound listening spotify', c: 'gaming' },
        { e: '🎤', n: 'microphone audio voice recording singing podcast speech', c: 'gaming' },
        { e: '🎵', n: 'musical note audio track song melody sound', c: 'gaming' },
        { e: '🎶', n: 'musical notes music song playlist audio harmony', c: 'gaming' },
        { e: '🎸', n: 'guitar rock music instrument acoustic electric', c: 'gaming' },
        { e: '🎹', n: 'piano musical keyboard synthesizer instrument music', c: 'gaming' },
        { e: '📻', n: 'radio broadcast audio fm stream podcast tuner', c: 'gaming' },
        { e: '🏆', n: 'trophy champion win achievement winner prize contest', c: 'gaming' },
        { e: '🥇', n: '1st place medal gold winner rank first', c: 'gaming' },
        { e: '🥈', n: '2nd place medal silver rank runner up second', c: 'gaming' },
        { e: '🥉', n: '3rd place medal bronze rank third position', c: 'gaming' },
        { e: '🏅', n: 'sports medal honor achievement reward badge', c: 'gaming' },
        { e: '🎖️', n: 'military medal honor service reward rank', c: 'gaming' },
        { e: '🎭', n: 'performing arts theater drama comedy entertainment masks', c: 'gaming' },
        { e: '🎨', n: 'artist palette design art creative ui ux painting', c: 'gaming' },
        { e: '🪄', n: 'magic wand wizard auto trick feature sparkles generate', c: 'gaming' },
        { e: '🪅', n: 'pinata celebration fun party game rewards', c: 'gaming' },
        { e: '👾', n: 'alien monster retro space invader 8bit arcade pixel', c: 'gaming' },
        { e: '🎳', n: 'bowling ball pins game alley strike', c: 'gaming' },
        { e: '🎪', n: 'circus tent event show attraction festival', c: 'gaming' },
        { e: '🎟️', n: 'admission ticket movie cinema event concert entrance', c: 'gaming' },

        // Social & Web
        { e: '💬', n: 'speech bubble chat message discussion comment discord', c: 'social' },
        { e: '🗨️', n: 'left speech bubble dialog talk chat thread forum', c: 'social' },
        { e: '📢', n: 'loudspeaker announcement broadcast news alert notice', c: 'social' },
        { e: '📣', n: 'megaphone broadcast cheering shouting marketing promo', c: 'social' },
        { e: '🔔', n: 'bell notification alert chime notify subscribe push', c: 'social' },
        { e: '🔕', n: 'bell slash mute silence quiet no notifications', c: 'social' },
        { e: '💌', n: 'love letter heart envelope romantic email note', c: 'social' },
        { e: '✉️', n: 'envelope email letter mail gmail outlook inbox', c: 'social' },
        { e: '📧', n: 'e-mail electronic message inbox communication letter', c: 'social' },
        { e: '📬', n: 'mailbox full flag letter mail delivery received', c: 'social' },
        { e: '📮', n: 'postbox mailbox post office mailing letters send', c: 'social' },
        { e: '☎️', n: 'telephone rotary landline phone call vintage', c: 'social' },
        { e: '📞', n: 'telephone receiver call handset contact support phone', c: 'social' },
        { e: '👥', n: 'busts in silhouette team group users community members', c: 'social' },
        { e: '👤', n: 'bust silhouette user profile account single member person', c: 'social' },
        { e: '🤝', n: 'handshake partnership agreement deal collaboration meeting', c: 'social' },
        { e: '🗣️', n: 'speaking head talking conversation voice pitch shout', c: 'social' },
        { e: '❤️', n: 'red heart love favorite like bookmark passion', c: 'social' },
        { e: '⭐', n: 'star favorite bookmark starred important highlight rated', c: 'social' },
        { e: '🌟', n: 'glowing star sparkle shine magic featured award', c: 'social' },
        { e: '✨', n: 'sparkles clean new magic shiny special ai glow', c: 'social' },
        { e: '🔥', n: 'fire hot trending popular flame burn streak viral', c: 'social' },
        { e: '👍', n: 'thumbs up like approve agree positive success good', c: 'social' },
        { e: '🎉', n: 'party popper celebrate congratulation milestone win happy', c: 'social' },

        // Work & Office
        { e: '💼', n: 'briefcase work job office business corporate career professional', c: 'work' },
        { e: '📁', n: 'file folder directory organize storage documents default', c: 'work' },
        { e: '📂', n: 'open folder open directory explorer files browse', c: 'work' },
        { e: '🗂️', n: 'card index dividers tabs organization organizer records', c: 'work' },
        { e: '📑', n: 'bookmark tabs documents pages report notes manual', c: 'work' },
        { e: '📄', n: 'page facing up file doc document paper sheet text', c: 'work' },
        { e: '📃', n: 'page with curl statement document contract terms bill', c: 'work' },
        { e: '📋', n: 'clipboard copy paste tasks todo checklist audit survey', c: 'work' },
        { e: '📊', n: 'bar chart spreadsheet data analytics presentation report', c: 'work' },
        { e: '📌', n: 'pushpin pin pinned favorite location mark save sticky', c: 'work' },
        { e: '📍', n: 'round pushpin location map pin spot point place', c: 'work' },
        { e: '📎', n: 'paperclip attachment link attach file associate docs', c: 'work' },
        { e: '📏', n: 'straight ruler measure scale dimensions engineer metrics', c: 'work' },
        { e: '📐', n: 'triangular ruler design architecture math diagram build', c: 'work' },
        { e: '✂️', n: 'scissors cut edit clip snip remove split tool', c: 'work' },
        { e: '🖊️', n: 'pen ballpoint write sign document notes compose', c: 'work' },
        { e: '🖋️', n: 'fountain pen contract signature luxury official write', c: 'work' },
        { e: '✏️', n: 'pencil edit draft sketch draw notes write pencil', c: 'work' },
        { e: '📝', n: 'memo note taking writing task memo message draft', c: 'work' },
        { e: '📅', n: 'calendar schedule date meeting event deadline reminder', c: 'work' },
        { e: '📆', n: 'tear-off calendar date day planner agenda schedule', c: 'work' },
        { e: '🗓️', n: 'spiral calendar schedule planning appointment timeline', c: 'work' },
        { e: '🗃️', n: 'card file box archive database storage catalog records', c: 'work' },
        { e: '🗄️', n: 'file cabinet office storage records database enterprise', c: 'work' },
        { e: '🗑️', n: 'wastebasket trash garbage delete remove recycle bin', c: 'work' },

        // Smileys & People
        { e: '😀', n: 'grinning face happy smile cheerful positive', c: 'smileys' },
        { e: '😃', n: 'smiling face big open mouth joyful laugh pleasant', c: 'smileys' },
        { e: '😄', n: 'smiling face with smiling eyes glad happy warmth', c: 'smileys' },
        { e: '😁', n: 'beaming face proud grin grin smile teeth joy', c: 'smileys' },
        { e: '😆', n: 'grinning squinting face laugh haha funny amused', c: 'smileys' },
        { e: '😅', n: 'grinning face with sweat relief phew close nervous', c: 'smileys' },
        { e: '😂', n: 'face with tears of joy lol laughing crying hilarious', c: 'smileys' },
        { e: '🤣', n: 'rolling on floor laughing rofl dying hilarious funny', c: 'smileys' },
        { e: '😊', n: 'smiling face blush warm sweet happy modest', c: 'smileys' },
        { e: '😇', n: 'smiling face with halo angel innocent good pure holy', c: 'smileys' },
        { e: '🙂', n: 'slightly smiling face gentle fine ok calm', c: 'smileys' },
        { e: '🙃', n: 'upside down face irony sarcasm silly goofy joke', c: 'smileys' },
        { e: '😉', n: 'winking face wink playful flirt secret joke hint', c: 'smileys' },
        { e: '😌', n: 'relieved face zen peace relaxed calm safe resting', c: 'smileys' },
        { e: '😍', n: 'heart eyes love admire crush adore romantic', c: 'smileys' },
        { e: '🥰', n: 'smiling face with hearts loved affectionate sweet adore', c: 'smileys' },
        { e: '😘', n: 'face blowing a kiss kiss love romantic bye affectionate', c: 'smileys' },
        { e: '😋', n: 'face savoring food delicious tasty yummy silly', c: 'smileys' },
        { e: '😛', n: 'face with tongue playful goofy silly joke fun', c: 'smileys' },
        { e: '😜', n: 'winking face with tongue crazy wild joke cheeky party', c: 'smileys' },
        { e: '🤪', n: 'zany face goofy crazy wild wacky goofy silly', c: 'smileys' },
        { e: '🤑', n: 'money mouth face rich millionaire cash wealthy profit', c: 'smileys' },
        { e: '🤗', n: 'smiling face with open hands hugging hug welcome warm', c: 'smileys' },
        { e: '🤫', n: 'shushing face quiet silence secret hush classified private', c: 'smileys' },
        { e: '🤔', n: 'thinking face hmm wonder consider question speculate', c: 'smileys' },
        { e: '🤐', n: 'zipper mouth face silent secret confidential sealed', c: 'smileys' },
        { e: '🤨', n: 'face with raised eyebrow suspicious skeptical doubt inspect', c: 'smileys' },
        { e: '😐', n: 'neutral face straight poker face emotionless ok', c: 'smileys' },
        { e: '😑', n: 'expressionless face tired bored blank poker face', c: 'smileys' },
        { e: '😶', n: 'face without mouth speechless quiet mute anonymous blank', c: 'smileys' },
        { e: '😏', n: 'smirking face sly confident cheeky cocky knowing', c: 'smileys' },
        { e: '😒', n: 'unamused face annoyed bored unimpressed side eye', c: 'smileys' },
        { e: '🙄', n: 'face with rolling eyes eye roll whatever annoyed sarcasm', c: 'smileys' },
        { e: '😬', n: 'grimacing face awkward oof yikes nervous cringe', c: 'smileys' },
        { e: '🤥', n: 'lying face pinocchio long nose fake fraud untrue', c: 'smileys' },
        { e: '😌', n: 'relieved content satisfied calm pleasant peaceful', c: 'smileys' },
        { e: '😔', n: 'pensive face sad regret down depressed sorrow', c: 'smileys' },
        { e: '😪', n: 'sleepy face tired exhausted yawn nap rest', c: 'smileys' },
        { e: '🤤', n: 'drooling face craving delicious sleep asleep dream', c: 'smileys' },
        { e: '😴', n: 'sleeping face zzz asleep bedtime snooze resting', c: 'smileys' },
        { e: '😷', n: 'face with medical mask sick health corona quarantine virus', c: 'smileys' },
        { e: '🤒', n: 'face with thermometer fever sick illness ill warm', c: 'smileys' },
        { e: '🤕', n: 'face with head bandage injured hurt head wound accident', c: 'smileys' },
        { e: '🤢', n: 'nauseated face disgusted gross sick puking green', c: 'smileys' },
        { e: '🤮', n: 'face vomiting puking gross sick barf disgusted', c: 'smileys' },
        { e: '🤧', n: 'sneezing face cold flu tissue allergy sick', c: 'smileys' },
        { e: '🥵', n: 'hot face sweating red fever warm thirsty heat', c: 'smileys' },
        { e: '🥶', n: 'cold face freezing blue ice cold winter shivering', c: 'smileys' },
        { e: '🥴', n: 'woozy face dizzy drunk intoxicated weird confused', c: 'smileys' },
        { e: '😵', n: 'dizzy face knocked out shocked overwhelmed dead stunned', c: 'smileys' },
        { e: '🤯', n: 'exploding head mind blown shocked amazed disbelief wow', c: 'smileys' },
        { e: '🤠', n: 'cowboy hat face wild west sheriff ranger southern', c: 'smileys' },
        { e: '🥳', n: 'partying face celebrate horn hat birthday party cheers', c: 'smileys' },
        { e: '🥸', n: 'disguised face glasses mustache incognito disguise spy undercover', c: 'smileys' },
        { e: '😎', n: 'smiling face with sunglasses cool boss awesome chill styling', c: 'smileys' },
        { e: '🤓', n: 'nerd face glasses geek smart genius coder developer', c: 'smileys' },
        { e: '🧐', n: 'face with monocle classy inspect investigate smart examine', c: 'smileys' },
        { e: '😕', n: 'confused face puzzled uncertain shrug doubtful lost', c: 'smileys' },
        { e: '😟', n: 'worried face anxious nervous concerned tense uneasy', c: 'smileys' },
        { e: '🙁', n: 'slightly frowning face disappointed sad unhappy grim', c: 'smileys' },
        { e: '😮', n: 'face with open mouth surprised wow gasping amazed awe', c: 'smileys' },
        { e: '😯', n: 'hushed face surprised quiet stunned mild shock', c: 'smileys' },
        { e: '😲', n: 'astonished face totally amazed shocked unbelievable', c: 'smileys' },
        { e: '😳', n: 'flushed face embarrassed shy red blush wide eyes shocked', c: 'smileys' },
        { e: '🥺', n: 'pleading face puppy eyes please beg cute sad request', c: 'smileys' },
        { e: '😦', n: 'frowning face with open mouth surprised shocked upset dismay', c: 'smileys' },
        { e: '😧', n: 'anguished face troubled stressed strained shocked pain', c: 'smileys' },
        { e: '😨', n: 'fearful face scared frightened terrified nervous alarmed', c: 'smileys' },
        { e: '😰', n: 'anxious face with sweat stressed panicked pressure work', c: 'smileys' },
        { e: '😥', n: 'sad but relieved face phew close call sweat tear disappointment', c: 'smileys' },
        { e: '😢', n: 'crying face tear sad emotional weeping heartbroken sorrow', c: 'smileys' },
        { e: '😭', n: 'loudly crying face bawling sob overwhelmed heartbreak tear', c: 'smileys' },
        { e: '😱', n: 'face screaming in fear horrified scream panic terrified munch', c: 'smileys' },
        { e: '😖', n: 'confounded face frustrated annoyed struggling pain cringe', c: 'smileys' },
        { e: '😣', n: 'persevering face struggling enduring painful effort tense', c: 'smileys' },
        { e: '😞', n: 'disappointed face letdown sad regret fail defeated depressed', c: 'smileys' },
        { e: '😓', n: 'downcast face with sweat exhausted hard work workout stress', c: 'smileys' },
        { e: '😩', n: 'weary face tired fed up exhausted lament drama moan', c: 'smileys' },
        { e: '😫', n: 'tired face sleepless drained overworked yawn done', c: 'smileys' },
        { e: '🥱', n: 'yawning face sleepy bored nap bedtime exhausted lullaby', c: 'smileys' },
        { e: '😤', n: 'face with steam from nose proud determined angry huff furious', c: 'smileys' },
        { e: '😡', n: 'enraged face pouting mad furious angry rage red', c: 'smileys' },
        { e: '😠', n: 'angry face mad displeased scowl grumpy cross irritated', c: 'smileys' },
        { e: '🤬', n: 'face with symbols on mouth swearing cursing profanity angry', c: 'smileys' },
        { e: '😈', n: 'smiling face with horns devil evil mischievous naughty villain', c: 'smileys' },
        { e: '👿', n: 'angry face with horns demon devil fury malice evil', c: 'smileys' },
        { e: '💀', n: 'skull dead skeleton death danger rip hilarious dead', c: 'smileys' },
        { e: '☠️', n: 'skull and crossbones pirate danger toxic hazard death lethal', c: 'smileys' },
        { e: '💩', n: 'pile of poo poop crap funny silly stink turd', c: 'smileys' },
        { e: '🤡', n: 'clown face circus joke foolish silly goofy funny', c: 'smileys' },
        { e: '👻', n: 'ghost halloween phantom boo spooky supernatural spirit', c: 'smileys' },
        { e: '👽', n: 'alien extraterrestrial ufo sci fi outer space sci-fi', c: 'smileys' },
        { e: '🎃', n: 'jack-o-lantern pumpkin halloween autumn spooky fall trick', c: 'smileys' },

        // Travel & Places
        { e: '✈️', n: 'airplane flight airport trip travel vacation fly overseas booking', c: 'travel' },
        { e: '🚁', n: 'helicopter chopper fly aviation rotor charter flight', c: 'travel' },
        { e: '🚂', n: 'locomotive steam train railroad station commute transit', c: 'travel' },
        { e: '🚆', n: 'train railway electric express commute passenger transit', c: 'travel' },
        { e: '🚄', n: 'high speed train bullet shinkansen fast transit express', c: 'travel' },
        { e: '🚅', n: 'bullet train nose high speed modern transport japan', c: 'travel' },
        { e: '🚗', n: 'automobile red car commute ride driving uber roadtrip', c: 'travel' },
        { e: '🚘', n: 'oncoming automobile car vehicle driving transport front', c: 'travel' },
        { e: '🚕', n: 'taxi cab ride transport uber lyft driver yellow', c: 'travel' },
        { e: '🚙', n: 'sport utility vehicle suv jeep car road family truck', c: 'travel' },
        { e: '🚌', n: 'bus school bus public transport transit commute passenger', c: 'travel' },
        { e: '🏎️', n: 'racing car formula f1 race driver fast speed motorsport', c: 'travel' },
        { e: '🚓', n: 'police car patrol emergency law enforcement siren cop', c: 'travel' },
        { e: '🚑', n: 'ambulance medical emergency hospital patient first aid siren', c: 'travel' },
        { e: '🚒', n: 'fire engine truck fire department brigade rescue emergency', c: 'travel' },
        { e: '🚐', n: 'minibus van camper transport passenger travel trip', c: 'travel' },
        { e: '🛻', n: 'pickup truck cargo hauling payload farm utility vehicle', c: 'travel' },
        { e: '🚚', n: 'delivery truck freight transport cargo logistics moving amazon', c: 'travel' },
        { e: '🚛', n: 'articulated lorry semi truck big rig highway hauler freight', c: 'travel' },
        { e: '🚜', n: 'tractor farm agriculture harvest rural machinery country', c: 'travel' },
        { e: '🏍️', n: 'motorcycle bike harley speed transport rider biker', c: 'travel' },
        { e: '🛵', n: 'motor scooter moped vespa city commute delivery ride', c: 'travel' },
        { e: '🚲', n: 'bicycle bike cycling pedal fitness commute healthy eco', c: 'travel' },
        { e: '🛴', n: 'kick scooter electric scooter micro mobility city commute', c: 'travel' },
        { e: '🛹', n: 'skateboard skate street park trick sports board rider', c: 'travel' },
        { e: '🚢', n: 'ship cruise boat vessel cargo passenger sea ocean liner', c: 'travel' },
        { e: '⛵', n: 'sailboat sailing boat water sea ocean yacht regatta', c: 'travel' },
        { e: '🛳️', n: 'passenger ship cruise ocean travel vacation luxury maritime', c: 'travel' },
        { e: '🛥️', n: 'motor boat speed yacht luxury leisure sea lake marina', c: 'travel' },
        { e: '🏠', n: 'house home building real estate residence mortgage property', c: 'travel' },
        { e: '🏡', n: 'house with garden home yard suburban residence mortgage', c: 'travel' },
        { e: '🏢', n: 'office building company headquarters skyscraper corporate work', c: 'travel' },
        { e: '🏣', n: 'japanese post office building mail service letters', c: 'travel' },
        { e: '🏥', n: 'hospital medical clinic emergency clinic doctor healthcare', c: 'travel' },
        { e: '🏨', n: 'hotel stay booking reservation motel resort vacation room', c: 'travel' },
        { e: '🏬', n: 'department store mall retail shopping commerce boutique', c: 'travel' },
        { e: '🏫', n: 'school building education student university classroom academy', c: 'travel' },
        { e: '🏛️', n: 'classical building government bank museum courthouse institution', c: 'travel' },
        { e: '⛪', n: 'church religion chapel worship prayer christian community', c: 'travel' },
        { e: '🏰', n: 'castle fortress fairytale medieval royalty palace kingdom', c: 'travel' },
        { e: '🗼', n: 'tokyo tower eiffel landmark sightseeing architecture destination', c: 'travel' },
        { e: '🗽', n: 'statue of liberty new york landmark freedom usa destination', c: 'travel' },
        { e: '🏖️', n: 'beach with umbrella summer vacation sand sea resort holiday', c: 'travel' },
        { e: '🏕️', n: 'camping tent outdoors nature wilderness bonfire camp adventure', c: 'travel' },
        { e: '🏔️', n: 'snow-capped mountain peaks hiking winter alpine altitude climbing', c: 'travel' },
        { e: '🗻', n: 'mount fuji volcano japan landmark nature mountain snow peak', c: 'travel' },
        { e: '🌋', n: 'volcano eruption lava crater disaster nature island geology', c: 'travel' },
        { e: '🏝️', n: 'desert island tropical beach ocean vacation remote secluded', c: 'travel' },
        { e: '🗺️', n: 'world map navigation geography travel exploration atlas trip', c: 'travel' },
        { e: '🧳', n: 'luggage suitcase baggage travel airport vacation packing travel', c: 'travel' },

        // Objects & Tools
        { e: '🚪', n: 'door entryway room entrance exit gateway access interior', c: 'objects' },
        { e: '🪑', n: 'chair seat furniture office desk sit interior comfort', c: 'objects' },
        { e: '🛋️', n: 'couch and lamp sofa living room furniture relax home interior', c: 'objects' },
        { e: '🛏️', n: 'bed sleep hotel bedroom furniture rest mattress nap', c: 'objects' },
        { e: '🔦', n: 'flashlight torch light beam inspection emergency power tool', c: 'objects' },
        { e: '🕯️', n: 'candle wax flame light cozy dinner power outage memorial', c: 'objects' },
        { e: '🧯', n: 'fire extinguisher safety put out fire emergency security building', c: 'objects' },
        { e: '🪔', n: 'diya lamp oil light diwali festival traditional culture sacred', c: 'objects' },
        { e: '🧲', n: 'magnet attract physics magnetic field pull force horseshoe', c: 'objects' },
        { e: '💣', n: 'bomb explosive explosion danger threat blast demolition fuse', c: 'objects' },
        { e: '🧨', n: 'firecracker fireworks celebration explosion festival new year', c: 'objects' },
        { e: '🔪', n: 'kitchen knife chef blade cooking cut sharp culinary slice', c: 'objects' },
        { e: '🗡️', n: 'dagger sword blade medieval knife weapon fantasy rogue', c: 'objects' },
        { e: '⚔️', n: 'crossed swords combat fight duel battle warrior war gaming', c: 'objects' },
        { e: '⚰️', n: 'coffin burial funeral dead rest casket vampire cemetery', c: 'objects' },
        { e: '⚱️', n: 'funeral urn ashes memorial cremation vase ancient pottery', c: 'objects' },
        { e: '🏺', n: 'amphora ancient jar clay vase antique greek roman vessel', c: 'objects' },
        { e: '🔮', n: 'crystal ball fortune teller prophecy psychic magic mystic future', c: 'objects' },
        { e: '📿', n: 'prayer beads rosary meditation faith zen spiritual mindfulness', c: 'objects' },
        { e: '🧿', n: 'nazar amulet evil eye protection talisman lucky ward charm', c: 'objects' },
        { e: '💈', n: 'barber pole haircut styling salon grooming trim shave retro', c: 'objects' },
        { e: '⚗️', n: 'alembic chemistry alchemy distillation science lab potion antique', c: 'objects' },
        { e: '🔭', n: 'telescope astronomy stars space galaxy observing cosmos explore', c: 'objects' },
        { e: '🩹', n: 'adhesive bandage bandaid first aid healing patch wound fix', c: 'objects' },
        { e: '🩺', n: 'stethoscope doctor clinic medicine healthcare heartbeat pulse exam', c: 'objects' },
        { e: '💊', n: 'pill capsule medicine drug pharmacy prescription vitamin health', c: 'objects' },
        { e: '💉', n: 'syringe injection vaccine blood test needle medical doctor clinical', c: 'objects' },
        { e: '🩸', n: 'drop of blood donation hematology medical injury transfusion', c: 'objects' },
        { e: '🧬', n: 'dna double helix genetics science biology genome research biotechnology', c: 'objects' },
        { e: '🦠', n: 'microbe bacteria virus germ pathogen infection biology illness', c: 'objects' },
        { e: '🧫', n: 'petri dish culture lab bacteria science sample biology experiment', c: 'objects' },
        { e: '🧪', n: 'test tube chemistry lab beaker science formula trial chemical', c: 'objects' },
        { e: '🌡️', n: 'thermometer temperature fever climate weather heat hot cold forecast', c: 'objects' },
        { e: '🧹', n: 'broom clean sweep chores witchcraft dust tidy janitor clean up', c: 'objects' },
        { e: '🧺', n: 'basket laundry picnic storage container wicker woven household', c: 'objects' },
        { e: '🧻', n: 'roll of paper toilet paper tissue wipe clean washroom hygiene', c: 'objects' },
        { e: '🧼', n: 'soap bar wash hands clean hygiene bubble bath sanitizing foam', c: 'objects' },
        { e: '🪥', n: 'toothbrush dental hygiene teeth smile brush morning routine dentist', c: 'objects' },
        { e: '🪒', n: 'razor shaving blade grooming sharp trim beard barbershop steel', c: 'objects' },
        { e: '🧽', n: 'sponge washing cleaning scrub dishes kitchen household absorbent', c: 'objects' },
        { e: '🪣', n: 'bucket pail mop cleaning container water paint chores wash', c: 'objects' },
        { e: '🧴', n: 'lotion bottle moisturizer cream dispenser soap hygiene skincare body', c: 'objects' },
        { e: '🛎️', n: 'bellhop bell hotel service desk reception concierge front desk ring', c: 'objects' },
        { e: '⌛', n: 'hourglass done time sand expired duration patience countdown timer', c: 'objects' },
        { e: '⏳', n: 'hourglass flowing time progress waiting loading countdown sand timer', c: 'objects' },
        { e: '⏰', n: 'alarm clock wakeup morning bell timer reminder deadline alert', c: 'objects' },
        { e: '⏱️', n: 'stopwatch race lap sprint timer precise chronograph workout athletic', c: 'objects' },
        { e: '⏲️', n: 'timer kitchen baking countdown clock dial interval cooking reminder', c: 'objects' },
        { e: '🕰️', n: 'mantelpiece clock vintage antique antique time shelf decoration horology', c: 'objects' },
        { e: '🧭', n: 'compass navigation orient magnetic north direction journey explorer guide', c: 'objects' },

        // Nature & Food
        { e: '🐶', n: 'dog face pet puppy canine faithful best friend woof domestic', c: 'nature' },
        { e: '🐱', n: 'cat face pet kitten feline meow purr domestic whiskers animal', c: 'nature' },
        { e: '🐭', n: 'mouse face rodent cheese pet squeak small animal whiskers', c: 'nature' },
        { e: '🐹', n: 'hamster face pet rodent cute cheeks small animal cage fluffy', c: 'nature' },
        { e: '🐰', n: 'rabbit face bunny easter pet ears cute fluffy hopping animal', c: 'nature' },
        { e: '🦊', n: 'fox face cunning clever orange forest wild animal woodland predator', c: 'nature' },
        { e: '🐻', n: 'bear face brown wilderness grizzly predator honey forest wildlife', c: 'nature' },
        { e: '🐼', n: 'panda face bamboo china bear cute black white wildlife endangered', c: 'nature' },
        { e: '🐨', n: 'koala australia marsupial eucalyptus cute sleepy wildlife down under', c: 'nature' },
        { e: '🐯', n: 'tiger face striped big cat wild predator jungle feline fierce', c: 'nature' },
        { e: '🦁', n: 'lion face king of jungle mane safari predator roar savanna wild', c: 'nature' },
        { e: '🐮', n: 'cow face farm cattle beef milk dairy moo agriculture pasture', c: 'nature' },
        { e: '🐷', n: 'pig face farm pork bacon oink domestic animal livestock snout', c: 'nature' },
        { e: '🐸', n: 'frog face amphibian toad pond green croak ribbit wildlife jump', c: 'nature' },
        { e: '🐵', n: 'monkey face primate ape cheeky playful jungle banana zoo wildlife', c: 'nature' },
        { e: '🐔', n: 'chicken poultry rooster farm bird domestic hen eggs cluck agriculture', c: 'nature' },
        { e: '🐧', n: 'penguin antarctic flightless bird cute waddle arctic cold snow ice', c: 'nature' },
        { e: '🐦', n: 'bird tweet flying feathered avian nature singing chirping wildlife', c: 'nature' },
        { e: '🦆', n: 'duck waterfowl quack mallard lake pond bird hunting feathers', c: 'nature' },
        { e: '🦅', n: 'eagle bird of prey raptor freedom usa national predator soaring', c: 'nature' },
        { e: '🦉', n: 'owl nocturnal bird wisdom night predator hoot wise wildlife forest', c: 'nature' },
        { e: '🐺', n: 'wolf pack predator wilderness howl forest wildlife canine alpha', c: 'nature' },
        { e: '🐴', n: 'horse face pony steed equestrian riding farm race wild stallion', c: 'nature' },
        { e: '🦄', n: 'unicorn horn fantasy mythical magical rainbow creature dream startup', c: 'nature' },
        { e: '🐝', n: 'honeybee bee insect pollen honey hive buzz sting pollinator yellow', c: 'nature' },
        { e: '🦋', n: 'butterfly wings insect transformation beauty metamorphosis caterpillar garden', c: 'nature' },
        { e: '🐢', n: 'turtle reptile slow shell tortoise terrapin marine wildlife nature', c: 'nature' },
        { e: '🐍', n: 'snake serpent reptile python hiss venom danger reptile wildlife slither', c: 'nature' },
        { e: '🐙', n: 'octopus tentacles sea creature cephalopod ocean marine intelligence ink', c: 'nature' },
        { e: '🐬', n: 'dolphin marine mammal intelligent playful ocean sea jumping aquatic', c: 'nature' },
        { e: '🐳', n: 'spouting whale ocean mammal marine huge water blowhole humpback sea', c: 'nature' },
        { e: '🦈', n: 'shark predator fin ocean marine jaws dangerous teeth coastal fish', c: 'nature' },
        { e: '🌲', n: 'evergreen tree pine forest nature cedar fir outdoor woods landscape', c: 'nature' },
        { e: '🌳', n: 'deciduous tree oak leaves nature shade park forest environment green', c: 'nature' },
        { e: '🌴', n: 'palm tree tropical beach island vacation summer warmth exotic oasis', c: 'nature' },
        { e: '🌵', n: 'cactus desert succulent drought heat prick dry xeriscape arid', c: 'nature' },
        { e: '🌾', n: 'sheaf of rice grain wheat agriculture harvest crop cereal field food', c: 'nature' },
        { e: '🌿', n: 'herb plant botanical leaf nature aromatic seasoning organic greenery', c: 'nature' },
        { e: '🍀', n: 'four leaf clover lucky fortune st patricks day luck irish charm green', c: 'nature' },
        { e: '🍁', n: 'maple leaf autumn fall canada foliage red seasons change seasonal', c: 'nature' },
        { e: '🍂', n: 'fallen leaf autumn leaves seasons brown foliage nature seasonal wind', c: 'nature' },
        { e: '🍄', n: 'mushroom fungus toadstool forest foraging spores cooking autumn mario', c: 'nature' },
        { e: '🍎', n: 'red apple fruit healthy fresh teacher snack food nutrition orchard', c: 'nature' },
        { e: '🍊', n: 'tangerine orange citrus fruit vitamin c fresh juicy breakfast sweet', c: 'nature' },
        { e: '🍋', n: 'lemon citrus sour yellow zest lemonade tart fruit cooking vitamin', c: 'nature' },
        { e: '🍌', n: 'banana fruit potassium peel yellow healthy snack monkey tropical food', c: 'nature' },
        { e: '🍉', n: 'watermelon summer fruit slice juicy red green seeds sweet picnic', c: 'nature' },
        { e: '🍇', n: 'grapes fruit wine vineyard bunch red purple bunch fruit healthy', c: 'nature' },
        { e: '🍓', n: 'strawberry berry red sweet summer fruit garden dessert fresh jam', c: 'nature' },
        { e: '🍒', n: 'cherries fruit sweet red pair cherry pie blossom dessert stem', c: 'nature' },
        { e: '🍑', n: 'peach fruit juicy sweet fuzzy stone fruit cobbler summer southern', c: 'nature' },
        { e: '🍍', n: 'pineapple tropical fruit sweet golden hawaii pina colada hospitality', c: 'nature' },
        { e: '🥑', n: 'avocado guacamole healthy fats green keto toast brunch superfood', c: 'nature' },
        { e: '🍕', n: 'pizza slice pepperoni cheese italian food takeout dinner restaurant fast', c: 'nature' },
        { e: '🍔', n: 'hamburger burger fast food cheeseburger beef bun diner grill fastfood', c: 'nature' },
        { e: '🍟', n: 'french fries potato chips fast food mcdonalds salted snack crispy side', c: 'nature' },
        { e: '🌮', n: 'taco mexican food shell beef lettuce cheese tuesday street food fiesta', c: 'nature' },
        { e: '🍣', n: 'sushi japanese food raw fish rice salmon tuna seaweed sashimi maki', c: 'nature' },
        { e: '🍜', n: 'steaming bowl ramen noodles soup broth chopsticks japanese asian warm', c: 'nature' },
        { e: '🍦', n: 'soft ice cream cone vanilla swirl dessert sweet dairy summer treat cold', c: 'nature' },
        { e: '🍩', n: 'doughnut donut pastry glazed chocolate sweet bakery breakfast sprinkles snack', c: 'nature' },
        { e: '🍪', n: 'cookie chocolate chip baked sweet dessert biscuit bakery treat snack', c: 'nature' },
        { e: '🎂', n: 'birthday cake celebration candles frosting party anniversary celebration sweet', c: 'nature' },
        { e: '🍫', n: 'chocolate bar sweet cacao confectionery candy dessert snack cocoa treat', c: 'nature' },
        { e: '☕', n: 'hot beverage coffee espresso mug tea cafe morning caffeine latte cup', c: 'nature' },
        { e: '🍵', n: 'teacup without handle green tea matcha japanese tea ceremony hot herb sip', c: 'nature' },
        { e: '🍺', n: 'beer mug alcohol pub draft lager ale foam pint drink brewery bar', c: 'nature' },
        { e: '🍻', n: 'clinking beer mugs cheers toast pub bar celebration party drinks pint', c: 'nature' },
        { e: '🥂', n: 'clinking glasses champagne toast celebration new years event party bubbly wine', c: 'nature' },
        { e: '🍷', n: 'wine glass red wine beverage alcohol vineyard merlot dinner banquet grape', c: 'nature' }
    ];

    // Global state for picker
    window.VaultKeyEmojiLibrary = {
        categories: EMOJI_CATEGORIES,
        items: EMOJI_ITEMS,
        activeCategory: 'all',
        searchQuery: '',
        currentCallback: null,

        // Render emoji grid into target container
        renderGrid: function (containerEl, filterCat, searchStr) {
            if (!containerEl) return;
            const query = (searchStr || '').toLowerCase().trim();
            const cat = filterCat || 'all';

            const filtered = EMOJI_ITEMS.filter(it => {
                const matchesCat = (cat === 'all') || (it.c === cat);
                if (!matchesCat) return false;
                if (!query) return true;
                return it.n.includes(query) || it.e.includes(query);
            });

            containerEl.innerHTML = '';
            if (filtered.length === 0) {
                containerEl.innerHTML = `
                    <div class="emoji-empty-result">
                        <span style="font-size: 26px;">🔍</span>
                        <span>No emojis found for "${escapeHtml(query)}"</span>
                        <span class="text-xs text-muted">Try searching for keywords like "card", "cloud", "game", "code"</span>
                    </div>
                `;
                return;
            }

            const frag = document.createDocumentFragment();
            filtered.forEach(it => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'emoji-picker-cell';
                btn.setAttribute('data-emoji', it.e);
                btn.setAttribute('title', `${it.e} ${it.n}`);
                btn.textContent = it.e;

                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof window.VaultKeyEmojiLibrary.currentCallback === 'function') {
                        window.VaultKeyEmojiLibrary.currentCallback(it.e);
                    }
                    window.VaultKeyEmojiLibrary.close();
                });

                frag.appendChild(btn);
            });

            containerEl.appendChild(frag);
        },

        // Open Picker Modal
        open: function (options) {
            const opts = options || {};
            this.currentCallback = opts.onSelect || null;

            const modal = document.getElementById('emojiPickerModal');
            if (!modal) return;

            const titleEl = document.getElementById('emojiPickerModalTitle');
            if (titleEl && opts.title) {
                titleEl.textContent = opts.title;
            }

            const searchInput = document.getElementById('emojiPickerSearchInput');
            if (searchInput) {
                searchInput.value = '';
                this.searchQuery = '';
            }

            this.activeCategory = 'all';
            const catContainer = document.getElementById('emojiPickerCategories');
            if (catContainer) {
                catContainer.querySelectorAll('.emoji-cat-pill').forEach(pill => {
                    pill.classList.toggle('active', pill.getAttribute('data-cat') === 'all');
                });
            }

            const grid = document.getElementById('emojiPickerGrid');
            this.renderGrid(grid, 'all', '');

            // Check if emoji-picker-element web component exists
            const webComponentWrapper = document.getElementById('emojiPickerWebComponentWrap');
            const libraryWrapper = document.getElementById('emojiPickerBuiltInWrap');
            const tabToggleBtn = document.getElementById('emojiPickerTabToggle');

            if (customElements.get('emoji-picker')) {
                if (tabToggleBtn) tabToggleBtn.style.display = 'inline-flex';
            } else {
                if (tabToggleBtn) tabToggleBtn.style.display = 'none';
                if (libraryWrapper) libraryWrapper.style.display = 'block';
                if (webComponentWrapper) webComponentWrapper.style.display = 'none';
            }

            modal.classList.remove('hidden');
            setTimeout(() => {
                if (searchInput) searchInput.focus();
            }, 60);
        },

        // Close Picker Modal
        close: function () {
            const modal = document.getElementById('emojiPickerModal');
            if (modal) modal.classList.add('hidden');
            this.currentCallback = null;
        },

        // Initialize listeners once
        init: function () {
            const modal = document.getElementById('emojiPickerModal');
            if (!modal) return;

            // Close button
            const closeBtn = document.getElementById('emojiPickerCloseBtn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.close());
            }

            // Click backdrop to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });

            // Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                    this.close();
                }
            });

            // Search input
            const searchInput = document.getElementById('emojiPickerSearchInput');
            const grid = document.getElementById('emojiPickerGrid');
            if (searchInput && grid) {
                searchInput.addEventListener('input', (e) => {
                    this.searchQuery = e.target.value;
                    this.renderGrid(grid, this.activeCategory, this.searchQuery);
                });
            }

            // Clear search
            const clearSearchBtn = document.getElementById('emojiPickerClearSearchBtn');
            if (clearSearchBtn && searchInput && grid) {
                clearSearchBtn.addEventListener('click', () => {
                    searchInput.value = '';
                    this.searchQuery = '';
                    this.renderGrid(grid, this.activeCategory, '');
                    searchInput.focus();
                });
            }

            // Category pills
            const catContainer = document.getElementById('emojiPickerCategories');
            if (catContainer && grid) {
                catContainer.innerHTML = '';
                EMOJI_CATEGORIES.forEach(cat => {
                    const pill = document.createElement('button');
                    pill.type = 'button';
                    pill.className = `emoji-cat-pill ${cat.id === 'all' ? 'active' : ''}`;
                    pill.setAttribute('data-cat', cat.id);
                    pill.innerHTML = `<span>${cat.icon}</span> <span>${cat.label}</span>`;
                    pill.addEventListener('click', () => {
                        catContainer.querySelectorAll('.emoji-cat-pill').forEach(p => p.classList.remove('active'));
                        pill.classList.add('active');
                        this.activeCategory = cat.id;
                        this.renderGrid(grid, this.activeCategory, this.searchQuery);
                    });
                    catContainer.appendChild(pill);
                });
            }

            // Web Component View Switcher (Full Unicode library toggle)
            const tabToggleBtn = document.getElementById('emojiPickerTabToggle');
            const webComponentWrapper = document.getElementById('emojiPickerWebComponentWrap');
            const libraryWrapper = document.getElementById('emojiPickerBuiltInWrap');
            let showingFullUnicode = false;

            if (tabToggleBtn && webComponentWrapper && libraryWrapper) {
                tabToggleBtn.addEventListener('click', () => {
                    showingFullUnicode = !showingFullUnicode;
                    if (showingFullUnicode) {
                        tabToggleBtn.textContent = '⚡ Quick Emojis';
                        libraryWrapper.style.display = 'none';
                        webComponentWrapper.style.display = 'block';

                        // Lazy mount <emoji-picker> if not mounted
                        if (!webComponentWrapper.querySelector('emoji-picker')) {
                            const pickerEl = document.createElement('emoji-picker');
                            pickerEl.className = 'vaultkey-emoji-picker';
                            pickerEl.addEventListener('emoji-click', (event) => {
                                const selected = event.detail && (event.detail.unicode || event.detail.emoji);
                                if (selected && typeof window.VaultKeyEmojiLibrary.currentCallback === 'function') {
                                    window.VaultKeyEmojiLibrary.currentCallback(selected);
                                }
                                window.VaultKeyEmojiLibrary.close();
                            });
                            webComponentWrapper.appendChild(pickerEl);
                        }
                    } else {
                        tabToggleBtn.textContent = '📚 Full Unicode Catalog';
                        libraryWrapper.style.display = 'block';
                        webComponentWrapper.style.display = 'none';
                    }
                });
            }
        }
    };

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
})();
