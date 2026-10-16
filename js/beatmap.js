// ============================================================
//  SKWISH DROP: THE BEATMAP
//
//  This file is the song and the notes for the game at /play/.
//
//  RIGHT NOW the game plays the placeholder beat at the bottom of
//  this file. The browser makes that beat on the spot, so there is
//  no audio file and nothing copyrighted. It stays in charge until
//  the track below has an audio file.
//
//  TO USE THE REAL TRACK, three lines are enough:
//    1. Put the file in the site, for example
//       assets/audio/skwish-drop.mp3 (MP3 or WAV both work).
//    2. In "track" below, set:
//         audio:  "/assets/audio/skwish-drop.mp3"
//         bpm:    the tempo, for example 145
//         offset: seconds from the start of the file to beat 1
//                 of bar 1. 0 if the file starts right on it.
//    3. Open /play/. With no notes listed, the game listens to the
//       track and makes the notes and the drops itself.
//
//  FOR A CLEANER CHART, make the notes ahead of time from the stems
//  (kick, snare, bass) with the beatmap maker:
//    in a browser:   open /tools/beatmap/ on the local site
//    in a terminal:  node tools/make-beatmap.js --mix song.wav
//                      --kick kick.wav --snare snare.wav
//                      --bass bass.wav --bpm 145 --write
//  Both fill in the track block below (between the TRACK lines),
//  and either one can guess the BPM and offset if you are not sure.
//  The notes it writes are normal lines you can edit by hand.
//
//  TRY A TRACK WITHOUT EDITING ANYTHING: open
//    /play/?audio=/assets/audio/skwish-drop.mp3&bpm=145&offset=0
//
//  NOTES
//    Each note is [beat, lane]. Beat 0 is beat 1 of bar 1, beat 4 is
//    the start of bar 2, and 4.5 is the "and" right after it.
//    Lanes are 0, 1, 2, 3 from left to right (keys D F J K).
//    Two notes on the same beat are a chord: hit both.
//
//  SECTIONS
//    Each section is a number of 4-beat bars, in order. "drop"
//    sections are where Skwish goes wild and the screen pulses.
//    A "countin" bar at the start shows 3, 2, 1, GO.
//
//  If every hit feels a little late on your setup, raise
//  inputOffsetMs (try 30). If they feel early, lower it.
// ============================================================

const BEATMAP = {
  title: "Skwish Drop",
  inputOffsetMs: 0,

  // >>> TRACK  (the beatmap maker rewrites everything down to the <<< TRACK line)
  track: {
    audio: "",
    bpm: 145,
    offset: 0,
    credit: "Music by Dirt Monkey",
    // easy, normal, or hard: how busy the notes are when the game makes them
    difficulty: "normal"
  },
  // <<< TRACK

  // The placeholder beat. Used while track.audio is empty.
  placeholder: {
    credit: "Placeholder beat, made in your browser",
    bpm: 140,

    // Each section is a number of 4-beat bars, in order.
    // Types: countin, intro, build, drop, break, outro.
    sections: [
      { type: "countin", bars: 1 },
      { type: "intro", bars: 4 },
      { type: "build", bars: 4 },
      { type: "drop", bars: 8 },
      { type: "break", bars: 4 },
      { type: "drop", bars: 8, variant: 2 },
      { type: "outro", bars: 2 }
    ],

    notes: [
      // bar 2
      [4, 0], [5, 1], [6, 2], [7, 3],
      // bar 3
      [8, 3], [9, 2], [10, 1], [11, 0],
      // bar 4
      [12, 0], [13, 2], [14, 1], [15, 3], [15.5, 2],
      // bar 5
      [16, 3], [17, 1], [18, 2], [18.5, 1], [19, 0], [19.5, 3],
      // bar 6
      [20, 1], [21, 2], [22, 1], [23, 2],
      // bar 7
      [24, 0], [24.5, 1], [25, 2], [25.5, 3], [26, 3], [26.5, 2], [27, 1], [27.5, 0],
      // bar 8
      [28, 1], [28.5, 2], [29, 1], [29.5, 2], [30, 0], [30.5, 3], [31, 0], [31.5, 3],
      // bar 9
      [32, 0], [32.5, 1], [33, 2], [33.5, 3], [34, 1], [34, 2],
      // bar 10
      [36, 0], [36, 3], [37, 1], [37.5, 2], [38, 3], [39, 2], [39.5, 1],
      // bar 11
      [40, 3], [40.5, 2], [41, 1], [41.5, 0], [42, 1], [42, 2], [43, 3], [43.5, 0],
      // bar 12
      [44, 0], [45, 1], [45.5, 2], [46, 3], [47, 2], [47.5, 1],
      // bar 13
      [48, 3], [48.5, 2], [49, 1], [49.5, 0], [50, 1], [50, 2], [51, 3], [51.5, 0],
      // bar 14
      [52, 0], [52.5, 0], [53, 1], [53.5, 2], [54, 3], [54.5, 3], [55, 2], [55.5, 1],
      // bar 15
      [56, 3], [56.5, 2], [57, 1], [57.5, 0], [58, 1], [58, 2], [59, 3], [59.5, 0],
      // bar 16
      [60, 0], [60.5, 0], [61, 1], [61.5, 2], [62, 3], [62.5, 3], [63, 2], [63.5, 1],
      // bar 17
      [64, 0], [64.5, 1], [65, 2], [65.5, 3], [66, 1], [66, 2], [67, 0], [67, 3],
      // bar 18
      [68, 1], [70, 2],
      // bar 19
      [72, 0], [73, 3], [74, 1],
      // bar 20
      [76, 2], [77, 1], [78, 3], [79, 0],
      // bar 21
      [80, 0], [80.5, 1], [81, 2], [81.5, 3], [82, 3], [82.5, 2], [83, 1], [83, 2],
      // bar 22
      [84, 0], [84, 3], [85, 2], [85.5, 1], [86, 0], [87, 1], [87.5, 2],
      // bar 23
      [88, 0], [88.5, 1], [89, 2], [89.5, 3], [90, 1], [90, 2], [91, 0], [91.5, 3],
      // bar 24
      [92, 3], [93, 2], [93.5, 1], [94, 0], [95, 1], [95.5, 2],
      // bar 25
      [96, 0], [96.5, 1], [97, 2], [97.5, 3], [98, 1], [98, 2], [99, 0], [99.5, 3],
      // bar 26
      [100, 3], [100.5, 3], [101, 2], [101.5, 1], [102, 0], [102.5, 0], [103, 1], [103.5, 2],
      // bar 27
      [104, 0], [104.5, 1], [105, 2], [105.5, 3], [106, 1], [106, 2], [107, 0], [107.5, 3],
      // bar 28
      [108, 3], [108.5, 3], [109, 2], [109.5, 1], [110, 0], [110.5, 0], [111, 1], [111.5, 2],
      // bar 29
      [112, 3], [112.5, 2], [113, 1], [113.5, 0], [114, 1], [114, 2], [115, 1], [115, 2],
      // bar 30
      [116, 0], [116, 3]
    ]
  }
};
