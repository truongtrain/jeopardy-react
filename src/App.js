import './App.css';
import React, {useState, useEffect} from 'react';
import showData from './jeopardy.json';
import Banner from './Banner';

const msg = new SpeechSynthesisUtterance();

const App = () => {
  const weakestContestant = showData.weakest_contestant;
  const contestants = showData.contestants.filter(
    contestant => contestant !== weakestContestant
  );
  contestants.push('Alan');
  const initalScores = {};
  contestants.forEach(contestant => initalScores[contestant] = 0);
  initalScores['Alan'] = 0;

  const [round, setRound] = useState(1);
  const [visible, setVisible] = useState(getDefaultVisible());
  const [board, setBoard] = useState(showData.jeopardy_round);
  const [tableStyle, setTableStyle] = useState('table-light-off');
  const [clueNumber, setClueNumber] = useState(1);
  const [message, setMessage] = useState('');
  const [correct, setCorrect] = useState('');
  const [scores, setScores] = useState(initalScores);
  const [seconds, setSeconds] = useState(0.0);
  const [responseTimerIsActive, setResponseTimerIsActive] = useState(false);
  const [responseCountdown, setResponseCountdown] = useState(5);
  const [responseCountdownIsActive, setResponseCountdownIsActive] = useState(false);
  const [selectedClue, setSelectedClue] = useState(getClue(1));
  let responseInterval = null;
  let responseCountdownInterval = null;

  // I buzz in by clicking scroll up or down
  useEffect(() => {
    document.addEventListener('scroll', () => {
      if (responseTimerIsActive) {
        answer();
      }
    }, { once: true });
  }, [responseTimerIsActive]);
  
  // determines how fast I click after the clue is read
  useEffect(() => {
    if (responseTimerIsActive) {
      responseInterval = setInterval(() => {
        setSeconds(seconds => seconds + 0.01);
      }, 10)
    } else {
        clearInterval(responseInterval);
    }   
    return () => clearInterval(responseInterval);
  }, [responseTimerIsActive]);

  // 5 second timer to respond after my name is called
  useEffect(() => {
    if (responseCountdownIsActive) {
      responseCountdownInterval = setInterval(() => {
        setResponseCountdown(responseCountdown => responseCountdown - 0.1);
      }, 100);
    } else {
        clearInterval(responseCountdownInterval);
    }   
    return () => clearInterval(responseCountdownInterval);
  }, [responseCountdownIsActive]);

  // press 's' to start the game
  useEffect(() => {
    document.addEventListener('keypress', e => {
      if (clueNumber === 1 && e.key === 's') {
        displayClueByNumber(1);
      }
    });
  }, []);

  // call this when buzzing in
  function answer() {
    setResponseTimerIsActive(false);
    const probability = getProbability(selectedClue.value, round);
    if (isFastestResponse(seconds, probability)) {
      readText('Alan');
      setResponseCountdownIsActive(true);
    } else if (selectedClue.response.correct_contestant != weakestContestant) {
      readText(selectedClue.response.correct_contestant);
      updateOpponentScores(selectedClue);
      const nextClueNumber = getNextClueNumber();
      setClueNumber(nextClueNumber);
      chooseClue(nextClueNumber);
    } else {
      setMessage(selectedClue.response.correct_response);
    }
  }

  function getNextClueNumber() {
    let clueNumberCopy = clueNumber + 1;
    let clue = getClue(clueNumberCopy);
    while (clue.text === '') {
      clueNumberCopy += 1;
      clue = getClue(clueNumberCopy);
    }
    return clueNumberCopy;
  }

  // opponent chooses clue
  function chooseClue(clueNumber) {
    turnOffLight();
    let visibleCopy = [...visible];
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 5; row++) {
        if (board[col][row].number === clueNumber) {
          const clue = board[col][row];
          const message = clue.category + ' for $' + clue.value;
          // readText(message);
          setCorrect('');
          //visibleCopy[row][col] = true;
          readClue(row, col, message);
          //showClue(visibleCopy, row, col);
          //setTimeout(() => showClue(visibleCopy, row, col), 2000);
          return;
        }
      }
    }
  }

  function displayClue(row, col) {
    turnOffLight();
    setMessage('');
    setCorrect('');
    setSeconds(0);
    setResponseCountdown(5);
    setSelectedClue(board[col][row]);
    setClueNumber(board[col][row].number);
    let visibleCopy = [...visible];
    if (visibleCopy[row][col] !== undefined) {
      visibleCopy[row][col] = true;
      setVisible(visibleCopy);
      readClue(row, col, '');
    }
  }

  function displayClueByNumber(clueNumber) {
    turnOffLight();
    let visibleCopy = [...visible];
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 5; row++) {
        if (board[col][row].number === clueNumber) {
          visibleCopy[row][col] = true;
          setVisible(visibleCopy);
          readClue(row, col, '');
        }
      }
    }
  }

  function getClue(clueNumber) {
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 5; row++) {
        if (board[col][row].number === clueNumber) {
          return board[col][row];
        }
      }
    }
    return null;
  }

  function readClue(row, col, topic) {
    const clue = showData.jeopardy_round[col][row];
    msg.text = topic + clue.text;
    window.speechSynthesis.speak(msg);
    msg.addEventListener('end', () => clearClue(row, col));
  }

  function clearClue(row, col) {
    let board_copy = [...board];
    board_copy[col][row].text = '';
    setBoard(board_copy);
    turnOnLight();
    setResponseTimerIsActive(true);
  }

  function getProbability(value, round) {
    if (round === 1) {
      switch (value) {
        case 200:
          return 0.333;
        case 400:
          return 0.377;
        case 600:
          return 0.383;
        case 800:
          return 0.418;
        case 1000:
          return 0.500;
      }
      switch (value) {
        case 400:
          return 0.350;
        case 800:
          return 0.412;
        case 1200:
          return 0.438;
        case 1600:
          return 0.500;
        case 2000:
          return 0.500;
      }
    }
  }

  function isFastestResponse(seconds, probability) {
    const randomNumber = Math.random();
    if (seconds <= 0.2) {
      return randomNumber < probability;
    } else if (seconds <= 0.4) {
      return randomNumber <= Math.pow(probability, 2);
    } else if (seconds <= 0.6) {
      return randomNumber <= Math.pow(probability, 3);
    } else if (seconds <= 0.8) {
      return randomNumber <= Math.pow(probability, 4);
    } else if (seconds <= 1) {
      return randomNumber <= Math.pow(probability, 5);
    } else if (seconds <= 1.2) {
      return randomNumber <= Math.pow(probability, 6);
    } else if (seconds <= 1.4) {
      return randomNumber <= Math.pow(probability, 7);
    } else if (seconds <= 1.6) {
      return randomNumber <= Math.pow(probability, 8);
    } else if (seconds <= 1.8) {
      return randomNumber <= Math.pow(probability, 9);
    } else if (seconds <= 2.0) {
      return randomNumber <= Math.pow(probability, 10);
    }
    return false;
  }

  function showClue(visibleCopy, row, col) {
    setVisible(visibleCopy);
    const clue = showData.jeopardy_round[col][row];
    if (clue.daily_double_wager > 0) {
      setMessage('Daily Double! Wager: ' + clue.daily_double_wager);
      setCorrect('');
    }
  }

  function showAnswer() {
    setResponseTimerIsActive(false);
    setResponseCountdownIsActive(false);
    setCorrect(selectedClue.response.correct_response);
  }

  function incrementScore() {
    msg.text = 'Correct';
    window.speechSynthesis.speak(msg);
    let scores_copy = {...scores};
    scores_copy['Alan'] += selectedClue.value;
    setScores(scores_copy);
  }

  function deductScore() {
    msg.text = 'No';
    window.speechSynthesis.speak(msg);
    let scores_copy = {...scores};
    scores_copy['Alan'] -= selectedClue.value;
    setScores(scores_copy);
  }

  function concede() {
    updateOpponentScores(selectedClue);
  }

  function updateOpponentScores(clue) {
    const incorrectContestants = clue.response.incorrect_contestants;
    const correctContestant = clue.response.correct_contestant;
    let scores_copy = {...scores};
    let scoreChange = clue.daily_double_wager > 0 ? clue.daily_double_wager : clue.value;
    if (incorrectContestants.length > 0) {
      for (let i = 0; i < incorrectContestants.length; i++) {
        setMessage(incorrectContestants[i] + ': What is ' + clue.response.incorrect_responses[i] + '?');
        setCorrect('Alex: No');
        scores_copy[incorrectContestants[i]] -= scoreChange;
      }
    }
    if (correctContestant && correctContestant !== weakestContestant) {
      setMessage(correctContestant + ': What is ' + clue.response.correct_response + '?');
      setCorrect('Alex: Yes');
      scores_copy[correctContestant] += scoreChange;
    }
    setScores(scores_copy);
  }

  function readText(text) {
    setMessage(text);
    msg.text = text;
    window.speechSynthesis.speak(msg);
  }

  function getDefaultVisible() {
    let visibleMatrix = [];
    for (let row = 0; row < 5; row++) {
      visibleMatrix.push([]);
      for (let col = 0; col < 6; col++) {
        visibleMatrix[row].push(false);
      }
    }
    return visibleMatrix;
  }

  function turnOffLight() {
    setTableStyle('table-light-off');
  }

  function turnOnLight() {
    setTableStyle('table-light-on');
  }

  return (
    <div>
      <Banner contestants={contestants} correct={correct} message={message} scores={scores} />
      
      <div className='banner'>
        <div>{seconds.toFixed(2)}</div>
        <button onClick={() => concede()}>Concede</button>
        <button onClick={() => showAnswer()}>Show Answer</button>
        <button onClick={() => incrementScore()}>Correct</button>
        <button onClick={() => deductScore()}>Incorrect</button>
        <div>{responseCountdown.toFixed(1)}</div>
      </div>
      
      <table className={tableStyle}>
        <thead>
          <tr>
            <th>{board[0][0].category}</th>
            <th>{board[1][0].category}</th>
            <th>{board[2][0].category}</th>
            <th>{board[3][0].category}</th>
            <th>{board[4][0].category}</th>
            <th>{board[5][0].category}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(Array(5), (arrayElement, row) => {
            return (<tr key={row}>
            {board.map((round, column) => {
              return (
              <td key={column}>
                <span>{visible[row][column] && round[row].text}</span>
                {
                  !visible[row][column] && <button className='clue-button' onClick={() => displayClue(row, column)}>
                  ${round[row].value}
                  </button>
                }
              </td>)})}
          </tr>)
          })}
        </tbody>
      </table>
    </div>
  );
}

export default App;
