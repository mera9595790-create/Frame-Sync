document.addEventListener('DOMContentLoaded', () => {
    browser.storage.sync.get('frameDelay', ({ frameDelay }) => {
        if (frameDelay) {
            document.getElementById('frameDelay').value = frameDelay;
        }
    });
});

onFrameDelayChange = (event) => {
    const frameDelay = event.target.value;
    try {
        const frameDelayNum = parseInt(frameDelay);
        if (isNaN(frameDelayNum)) {
            throw new Error('Invalid frame delay');
        }
        browser.storage.sync.set({ frameDelay: frameDelayNum });
    } catch {
        browser.storage.sync.set({ frameDelay: '' });
    }
}

const button = document.getElementById('pauseResumeButton');

button.addEventListener('click', async () => {
    const pauseDelay = (await browser.storage.sync.get('pauseDelay'))['pauseDelay'];
    const newValue = !pauseDelay;
    await browser.storage.sync.set({ pauseDelay: newValue });
    refreshPauseResumeButton();
});

const refreshPauseResumeButton = async () => {
    const pauseDelay = (await browser.storage.sync.get('pauseDelay'))['pauseDelay'];
    const isPaused = pauseDelay;
    button.textContent = isPaused ? 'Resume Delay' : 'Pause Delay';
}

refreshPauseResumeButton();

const frameDelayInput = document.getElementById('frameDelay');
frameDelayInput.addEventListener('input', onFrameDelayChange);

// Open the current page in a small popup window: the page DOM (and therefore
// the delay overlay) keeps working there, unlike in native PiP.
document.getElementById('miniWindowButton').addEventListener('click', async () => {
    try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const tab = tabs && tabs[0];
        if (!tab || !tab.url || tab.url.startsWith('about:')) {
            alert('No suitable page in the active tab.');
            return;
        }
        await browser.windows.create({
            url: tab.url,
            type: 'popup',
            width: 560,
            height: 400,
        });
        window.close();
    } catch (e) {
        console.error(e);
        alert('Could not open the mini window: ' + (e && e.message ? e.message : e));
    }
});