# Word Racing Game

A fun vocabulary learning game for 6th graders who love F1 racing. Combine word quiz with exciting racing action!

## Features

- **Vocabulary Quiz**: Test your knowledge of 6th grade vocabulary (Shanghai Edition/Oxford)
- **Racing Action**: Use earned fuel to race on F1-themed tracks
- **Shop System**: Buy fuel and nitro with quiz points
- **Leaderboard**: Track your progress and compete for high scores
- **Mobile Friendly**: Works on both PC and iPad (keyboard + touch support)

## How to Play

1. **Quiz Mode**: Answer vocabulary questions to earn fuel
   - Correct answer: +20 fuel
   - Wrong answer: -10 fuel

2. **Shop**: Spend your fuel wisely
   - Fuel (20 fuel): Basic fuel for racing
   - Nitro (50 fuel): Speed boost for 3 seconds

3. **Race**: Use arrow keys or touch controls
   - ↑ or touch top: Accelerate
   - ←→ or touch left/right: Steer
   - Space or touch bottom: Use nitro

4. **Goal**: Complete the race with the best time!

## Tech Stack

- Pure HTML5 + JavaScript (no build tools required)
- Canvas API for rendering
- LocalStorage for leaderboard persistence

## Getting Started

1. Clone the repository
2. Open `index.html` in a browser
   - Or run a local server: `python -m http.server 8080`
3. Start playing!

## Project Structure

```
word-racing/
├── index.html          # Main game page
├── css/
│   └── style.css      # Game styles
├── js/
│   ├── game.js        # Main game logic
│   ├── car.js         # Car physics and rendering
│   ├── track.js       # Track rendering
│   └── quiz.js        # Vocabulary quiz system
├── data/
│   └── words.json     # Vocabulary database
└── assets/            # Images and sounds (optional)
```

## Contributing

This project follows GitHub Flow:

1. Create a feature branch from `main`
2. Make your changes
3. Submit a Pull Request
4. Review and merge to `main`

## License

MIT License - Free to use for educational purposes

## Acknowledgments

Inspired by the movie "Pegasus" (飞驰人生) and the excitement of F1 racing!
