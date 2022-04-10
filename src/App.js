import './App.css';
import React, {useState, useEffect} from 'react';
import showData from './jeopardy.json';
import Banner from './Banner';

console.log(showData);

const App = () => {
  const weakestContestant = showData.weakest_contestant;
  const contestants = showData.contestants.filter(
    contestant => contestant !== weakestContestant
  );
  contestants.push('Alan');
  const initalScores = {};
  contestants.forEach(contestant => initalScores[contestant] = 0);

  const [round, setRound] = useState(1);
  const [visible, setVisible] = useState(getDefaultVisible());
  const [board, setBoard] = useState(showData.jeopardy_round);
  const [tableStyle, setTableStyle] = useState('table-light-off');
  const [clueNumber, setClueNumber] = useState(1);
  const [message, setMessage] = useState('');
  const [correct, setCorrect] = useState('');
  const [intervalIsActive, setIntervalIsActive] = useState(true);
  const [scores, setScores] = useState(initalScores);
  const [seconds, setSeconds] = useState(0.0);
  const [responseTimerIsActive, setResponseTimerIsActive] = useState(false);
  let interval = null;
  let responseInterval = null;

  document.addEventListener('click', () => answer());

  useEffect(() => {
    if (intervalIsActive) {
      interval = setInterval(() => chooseClue(clueNumber), 3000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [clueNumber]);

  useEffect(() => {
    if (responseTimerIsActive) {
      responseInterval = setInterval(() => {
        setSeconds(seconds => seconds + 0.1);
      }, 100)
    } else {
        clearInterval(responseInterval);
    }   
    return () => clearInterval(responseInterval);
  }, [responseTimerIsActive]);

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

  function answer() {
    setIntervalIsActive(false);
    clearInterval(interval);
    clearInterval(responseInterval);
    const clue = getClue(clueNumber);
    const probability = getProbability(clue.value, round);
    if (isFastestResponse(seconds, probability)) {
      setMessage('Alan');
    }
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
    if (seconds <= 0.25) {
      return randomNumber < probability;
    } else if (seconds <= 0.5) {
      return randomNumber <= Math.pow(probability, 2);
    } else if (seconds <= 0.75) {
      return randomNumber <= Math.pow(probability, 3);
    } else if (seconds <= 1.0) {
      return randomNumber <= Math.pow(probability, 4);
    } else if (seconds <= 1.25) {
      return randomNumber <= Math.pow(probability, 5);
    } else if (seconds <= 1.5) {
      return randomNumber <= Math.pow(probability, 6);
    } else if (seconds <= 1.75) {
      return randomNumber <= Math.pow(probability, 7);
    } else if (seconds <= 2.0) {
      return randomNumber <= Math.pow(probability, 8);
    }
  }

  function chooseClue(clueNumber) {
    setTableStyle('table-light-off');
    let visibleCopy = [...visible];
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 5; row++) {
        if (board[col][row].number === clueNumber) {
          const clue = board[col][row];
          const message = clue.category + ' for $' + clue.value;
          setMessage(message);
          setCorrect('');
          visibleCopy[row][col] = true;
          setTimeout(() => showClue(visibleCopy, row, col), 2000);
          return;
        }
      }
    }
    clearInterval(interval);
  }

  function showClue(visibleCopy, row, col) {
    setVisible(visibleCopy);
    const clue = showData.jeopardy_round[col][row];
    const charsPerSecond = 16;
    if (clue.daily_double_wager > 0) {
      setMessage('Daily Double! Wager: ' + clue.daily_double_wager);
      setCorrect('');
    }
    setTimeout(() => clearClue(row, col), 1000*clue.text.length/charsPerSecond);
  }

  function clearClue(row, col) {
    let board_copy = [...board];
    board_copy[col][row].text = '';
    setBoard(board_copy);
    setTableStyle('table-light-on');
    setResponseTimerIsActive(true);

    //updateScores(board_copy[col][row]);
    //setClueNumber(clueNumber+1);
  }

  function updateScores(clue) {
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
    if (correctContestant && correctContestant != weakestContestant) {
      setMessage(correctContestant + ': What is ' + clue.response.correct_response + '?');
      setCorrect('Alex: Yes');
      scores_copy[correctContestant] += scoreChange;
    }
    setScores(scores_copy);
  }

  function displayClue(row, column) {
    let visibleCopy = [...visible];
    if (visibleCopy[row][column] !== undefined) {
      visibleCopy[row][column] = true;
      setVisible(visibleCopy);
    }
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

  return (
    <div>
      <div>{seconds.toFixed(1)}</div>
      <Banner contestants={contestants} correct={correct} message={message} scores={scores} />
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
