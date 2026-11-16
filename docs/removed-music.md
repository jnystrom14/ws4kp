# Songs taken out of the Four-Cast playlist

Jen removed these Current Conditions album tracks on 2026-11-16 because they felt too upbeat. They may come back.

- Fall colors
- Downpour
- Catch the Sun
- Rolling Clouds
- Spring rain
- Spring Shower
- Moonlit sky
- First snow

The files are kept in git history. To put one back, run this from the repo folder (change the song name):

```
git checkout 7d3c7d9 -- "server/music/default/Moonlit sky.mp3"
```

Then level it to match the others (all tracks are leveled to -16 LUFS, 128 kbps, with ffmpeg loudnorm), commit and push.

Other slow jazz tracks she heard on 2026-11-16 but did not pick (Kevin MacLeod, incompetech.com, CC BY 4.0, credit needed in music.mjs CREDITS): Vibing Over Venus, Cool Vibes, Study And Relax, Groove Grove, Night in Venice, Daybreak, Leopard Print Elevator, Local Forecast - Slower.
