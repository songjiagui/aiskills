function printStartupBanner(port) {
   const reset = '\x1b[0m';

   const aiArtLines = [
      '  █████╗ ██╗    ███████╗ ██████╗ ',
      ' ██╔══██╗██║    ██╔════╝ ██╔══██╗',
      ' ███████║██║    █████╗   ██████╔╝',
      ' ██╔══██║██║    ██╔══╝   ██╔══██╗',
      ' ██║  ██║██║    ██║      ██║  ██║',
      ' ╚═╝  ╚═╝╚═╝    ╚═╝      ╚═╝  ╚═╝'
   ];

   const gradientColors = [
      '\x1b[38;5;160m',
      '\x1b[38;5;163m',
      '\x1b[38;5;165m',
      '\x1b[38;5;167m',
      '\x1b[38;5;169m',
      '\x1b[38;5;171m'
   ];

   const maxWidth = Math.max(...aiArtLines.map(line => line.length));
   const paddedArt = aiArtLines.map(line => line.padEnd(maxWidth));

   const aiArtColored = paddedArt.map((line, lineIdx) => {
      let coloredLine = '';
      for (let i = 0; i < line.length; i += 1) {
         const char = line[i];
         const ratio = (lineIdx / (paddedArt.length - 1) + i / line.length) / 2;
         const colorIndex = Math.floor(ratio * (gradientColors.length - 1));
         coloredLine += gradientColors[Math.min(colorIndex, gradientColors.length - 1)] + char;
      }
      return coloredLine + reset;
   });

   const padding = Math.max(0, 56 - maxWidth);
   const leftPad = Math.floor(padding / 2);
   const rightPad = padding - leftPad;

   const banner = [
      '',
      '\x1b[96m╔══════════════════════════════════════════════════════════╗' + reset,
      '\x1b[96m║' + reset + '                                                          \x1b[96m║' + reset,
      ...aiArtColored.map(line => '\x1b[96m║' + reset + '  ' + ' '.repeat(leftPad) + line + ' '.repeat(rightPad) + '\x1b[96m║' + reset),
      '\x1b[96m║' + reset + '                                                          \x1b[96m║' + reset,
      '\x1b[96m║' + reset + '   \x1b[33m🚀 Server Status: \x1b[32mONLINE' + reset + '                               \x1b[96m║' + reset,
      '\x1b[96m║' + reset + '   \x1b[33m🌐 Port: \x1b[32m' + String(port).padEnd(46) + reset + '\x1b[96m║' + reset,
      '\x1b[96m║' + reset + '   \x1b[33m⚡ Environment: \x1b[32mProduction Ready' + reset + '                       \x1b[96m║' + reset,
      '\x1b[96m║' + reset + '   \x1b[33m🤖 Models: \x1b[32m2 Available' + reset + '                                 \x1b[96m║' + reset,
      '\x1b[96m║' + reset + '                                                          \x1b[96m║' + reset,
      '\x1b[96m╚══════════════════════════════════════════════════════════╝' + reset,
      ''
   ];

   let delay = 0;
   const lineDelay = 30;

   banner.forEach(line => {
      setTimeout(() => {
         console.log(line);
      }, delay);
      delay += lineDelay;
   });

   setTimeout(() => {
      console.log(`\x1b[96m✨ \x1b[32mSystem initialized successfully!\x1b[0m\n`);
   }, delay + 100);
}

module.exports = {
   printStartupBanner
};
