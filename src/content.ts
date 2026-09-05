export type Language = 'nl' | 'en';

const corpora: Record<Language, string[]> = {
  nl: [
    'Op een vroege zaterdagochtend hing er nog nevel boven het water. Langs het pad reed een fietser rustig richting de oude brug, terwijl in de verte de eerste winkels hun deuren openden. De bakker zette een houten bord buiten en veegde het laatste meel van zijn schort. Bij het plein wachtte een hond geduldig naast een bankje. Niemand leek haast te hebben.',
    'In de bibliotheek viel het zonlicht in lange banen over de vloer. Mara zocht een boek over oude kaarten, maar bleef hangen bij een kast vol reisverhalen. Ze bladerde door een verslag van een tocht langs kleine eilanden en vergat even waarom ze gekomen was. Buiten reden bussen af en aan. Binnen hoorde je alleen papier, zachte stappen en af en toe een stoel.',
    'Na de lunch trok het team de wandelschoenen aan. Het pad begon breed tussen de velden, maar werd smaller zodra het bos dichter werd. Regen van de vorige nacht glansde nog op de bladeren. Bij iedere bocht veranderde het uitzicht. Na een uur bereikten ze een open plek waar een eenvoudige tafel stond. Daar deelden ze koffie en brood.',
    'De trein vertrok precies op tijd en liet de drukte van het station snel achter zich. Huizen maakten plaats voor weilanden, sloten en rijen populieren. Een reiziger werkte op zijn laptop, twee kinderen telden windmolens en iemand schonk thee uit een kleine thermoskan. Toen de conducteur langskwam, was de stad al niet meer aan de horizon te zien.',
    'Elke woensdag kookten de buren samen in de grote keuken beneden. De ene week stond er soep op tafel, de volgende week maakte iemand een gerecht uit een familieboek. Er werd geproefd, bijgestuurd en veel gepraat. Nieuwe bewoners hoefden niets mee te brengen. Aan het einde verdeelden ze wat over was in bakjes voor de volgende dag.',
    'Aan het einde van de middag werd de werkplaats stiller. Gereedschap ging terug aan de muur en het zaagsel werd bij elkaar geveegd. Op de middelste tafel stond een bijna voltooide stoel. De verbindingen sloten precies en het hout voelde glad aan. Alleen de zitting moest nog worden afgewerkt. Dat werk kon beter wachten tot het ochtendlicht.',
    'Het kleine café aan de haven had maar zes tafels. Vanaf het raam kon je zien hoe boten langzaam draaiden met het tij. Een vrouw schreef in een schrift, onderbrak zichzelf voor een slok koffie en keek daarna weer naar buiten. De eigenaar kende bijna iedereen bij naam. Voor bezoekers had hij altijd een goed verhaal over het weer.',
    'In september begon de tuin opnieuw te veranderen. De felle kleuren van de zomer werden zachter en spinnenwebben verschenen tussen de struiken. Tom verzamelde zaden in papieren zakjes en schreef zorgvuldig de namen erop. Wat nu klein en droog leek, zou in het voorjaar weer uitgroeien tot hoge bloemen waar bijen op afkwamen.',
    'Voor de vergadering legde Noor haar telefoon in een lade en schreef drie vragen op papier. Dat eenvoudige ritueel hielp haar om beter te luisteren. Het gesprek duurde korter dan gepland, omdat iedereen wist welk besluit nodig was. Na afloop bleef er tijd over om de eerste taak meteen samen uit te voeren.',
    'De markt liep langzaam leeg toen donkere wolken boven de daken verschenen. Handelaren vouwden hun kramen in en stapelden lege kisten op elkaar. Een laatste klant koos appels voor een taart. Nog voor de regen begon, reed de groentewagen de straat uit en rook het plein naar natte stenen en verse kruiden.'
  ],
  en: [
    'Early on Saturday morning, a thin mist still floated above the water. A cyclist followed the path toward the old bridge while the first shops opened in the distance. The baker placed a wooden sign outside and brushed flour from his apron. Near the square, a dog waited patiently beside a bench. Nobody seemed to be in a hurry.',
    'Sunlight fell in long stripes across the library floor. Maya was looking for a book about old maps, but stopped at a shelf filled with travel stories. She opened an account of a journey between small islands and briefly forgot why she had come. Buses moved outside. Inside, there was only paper, quiet footsteps, and an occasional chair.',
    'After lunch, the group put on their walking shoes. The path began wide between the fields, then narrowed as the forest grew thicker. Rain from the previous night still shone on the leaves. The view changed at every turn. After an hour they reached a clearing with a simple table, where they shared coffee and bread.',
    'The train left exactly on time and quickly moved beyond the busy station. Houses gave way to fields, narrow canals, and rows of tall trees. One traveler worked on a laptop, two children counted windmills, and someone poured tea from a small flask. By the time the conductor arrived, the city had disappeared from the horizon.',
    'Every Wednesday, the neighbors cooked together in the large kitchen downstairs. One week there was soup, and the next someone prepared a dish from an old family notebook. They tasted, adjusted, and talked. New residents did not need to bring anything. At the end, they divided the leftovers into containers for the following day.',
    'The workshop became quieter late in the afternoon. Tools returned to the wall and sawdust was swept into a neat pile. An almost finished chair stood on the center table. Its joints met precisely and the wood felt smooth. Only the seat still needed attention. That work could wait for the clear light of morning.',
    'The small cafe by the harbor had only six tables. Through the window, visitors could watch boats turn slowly with the tide. A woman wrote in a notebook, paused for a sip of coffee, and looked outside again. The owner knew nearly everyone by name. For visitors, he always had a good story about the weather.',
    'In September, the garden began to change again. The bright colors of summer became softer and spider webs appeared between the shrubs. Tom collected seeds in paper bags and carefully wrote a name on each one. What seemed small and dry now would grow into tall spring flowers that attracted bees from across the neighborhood.',
    'Before the meeting, Nora put her phone in a drawer and wrote three questions on paper. That simple ritual helped her listen more carefully. The conversation ended early because everyone understood which decision was needed. Afterwards, there was enough time to begin the first task together instead of scheduling another meeting.',
    'The market slowly emptied when dark clouds appeared above the roofs. Traders folded their stalls and stacked empty crates. One final customer chose apples for a pie. Before the rain began, the vegetable truck turned out of the street and the square smelled of wet stone and fresh herbs.'
  ]
};

export function makeWords(language: Language, amount: number, random = Math.random): string[] {
  const paragraphs = [...corpora[language]];
  for (let i = paragraphs.length - 1; i > 0; i--) {
    const swapWith = Math.floor(random() * (i + 1));
    [paragraphs[i], paragraphs[swapWith]] = [paragraphs[swapWith], paragraphs[i]];
  }
  const pool = paragraphs.flatMap(p => p.split(/\s+/));
  const result: string[] = [];
  while (result.length < amount) {
    result.push(...pool);
  }
  return result.slice(0, amount);
}
