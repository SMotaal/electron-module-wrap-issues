{
  const context =
    typeof window !== 'object' ? 'Main'
      : window.preloaded ? 'Window'
        : window.preloaded = 'Preload';

  const dirname = process.cwd();
  const preload = `${dirname}/main.js`;
  const src = `file://${dirname}/main.js`;
  const test = `file://${dirname}/test.mjs`;

  const completed = testLoader();

  if (context === 'Main') {
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true;

    const { app, BrowserWindow } = require('electron');

    let browserWindow;

    app.on('ready', () => {
      const content = String.raw`<b>Check the console</b>`;

      browserWindow = new BrowserWindow({
        webPreferences: { preload, webSecurity: false }
      });
      browserWindow.loadURL(`data:text/html,${content}`);
      browserWindow.webContents.openDevTools();
      browserWindow.once('closed', () => browserWindow = undefined);
    });

  } else if (context === 'Preload') {
    requestAnimationFrame(() => {
      const script = document.createElement('script');
      script.src = src;
      completed.then(() => document.head.appendChild(script));
    });
  }

  async function testLoader() {
    const Loader = process.NativeModule.require('internal/loader/Loader');
    const loader = new Loader;
    const { log, error, warn, group, groupEnd } = global.console;
    const relative = (pathname) => pathname.replace(dirname, '.');
    const testImport = async (specifier, i, j = 1) => {
      try {
        log(
          '\n[%s]\n\n\tImport:\t%d\n\tAttempt:\t%d\n\tSpecifier:\t"%s"\n\n',
          context, i, j, relative(specifier),
          await loader.import(specifier)
        );
      } catch (exception) {
        warn(
          '\n[%s]\n\n\tImport:\t%d\n\tAttempt:\t%d\n\tSpecifier:\t"%s"\n\n',
          context, i, j, relative(specifier),
          exception
        );
        if (j === 1) {
          return testImport(`${specifier}#${++j}`, i, j);
        }
      }
    }

    group(context);
    for (let i = 0, specifier; i++ < 2;) {
      await testImport(test, i);
    }
    groupEnd();
  }

}
