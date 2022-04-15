import './App.css';
import React, {useState, useEffect} from 'react';
import showData from './jeopardy.json';
import Banner from './Banner';

const msg = new SpeechSynthesisUtterance();
const playerName = 'Alan';
const hostName = 'Trebek';

const App = () => {
  let responseInterval = null;
  let responseCountdownInterval = null;

  const weakestContestant = showData.weakest_contestant;
  const contestants = showData.contestants.filter(
    contestant => contestant !== weakestContestant
  );
  contestants.push(playerName);
  const initalScores = {};
  contestants.forEach(contestant => initalScores[contestant] = 0);
  initalScores[playerName] = 0;

  const [visible, setVisible] = useState(getDefaultVisible());
  const [board, setBoard] = useState(showData.jeopardy_round);
  const [tableStyle, setTableStyle] = useState('table-light-off');
  const [message, setMessage] = useState('');
  const [correct, setCorrect] = useState('');
  const [scores, setScores] = useState(initalScores);
  const [seconds, setSeconds] = useState(0.0);
  const [responseCountdown, setResponseCountdown] = useState(5);
  const [responseCountdownIsActive, setResponseCountdownIsActive] = useState(false);
  const [responseTimerIsActive, setResponseTimerIsActive] = useState(false);
  const [availableClueNumbers, setAvailableClueNumbers] = useState(initializeAvailableClueNumbers());
  const [selectedClue, setSelectedClue] = useState(getClue(1));
  const [lastCorrectContestant, setLastCorrectContestant] = useState(playerName);
  const [round, setRound] = useState(1);

  // I buzz in by clicking scroll up or down
  // useEffect(() => {
  //   document.addEventListener('scroll', () => {
  //     if (responseTimerIsActive) {
  //       const answer = () => {
  //         setResponseTimerIsActive(false);
  //         const probability = getProbability(selectedClue.value, round);
  //         if (isFastestResponse(seconds, probability) || selectedClue.response.correct_contestant.length === 0) {
  //           readText(playerName);
  //           setResponseCountdownIsActive(true);
  //         } else if (selectedClue.response.correct_contestant !== weakestContestant) {
  //           readText(selectedClue.response.correct_contestant);
  //           updateOpponentScores(selectedClue);
  //           const nextClueNumber = getNextClueNumber();
  //           console.log('buzz');
  //           displayClueByNumber(nextClueNumber);
  //         } else {
  //           setMessage(selectedClue.response.correct_response);
  //         }
  //       };
  //       answer();
  //     }
  //   }, { once: true });
  // }, [responseTimerIsActive]);
  
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
      if (e.key === 's') {
        setLastCorrectContestant(contestants[0]);
        displayClueByNumber(1);
      }
    });
  }, []);

  function answer() {
    setResponseTimerIsActive(false);
    const probability = getProbability(selectedClue.value, round);
    if (isFastestResponse(seconds, probability) || isTripleStumper()) {
      readText(playerName);
      setResponseCountdownIsActive(true);
    } else if (selectedClue.response.correct_contestant !== weakestContestant) {
      readText(selectedClue.response.correct_contestant);
      updateOpponentScores(selectedClue);
      const nextClueNumber = getNextClueNumber();
      console.log('buzz');
      displayClueByNumber(nextClueNumber);
    } else {
      setMessage(selectedClue.response.correct_response);
    }
  }

  function updateOpponentScores(clue) {
    const nextClueNumber = getNextClueNumber();
    const nextClue = getClue(nextClueNumber);
    const message = nextClue.category + ' for $' + nextClue.value;
    const incorrectContestants = clue.response.incorrect_contestants;
    const correctContestant = clue.response.correct_contestant;
    let scores_copy = {...scores};
    let scoreChange = clue.daily_double_wager > 0 ? clue.daily_double_wager : clue.value;
    // handle triple stumpers
    if (!correctContestant || correctContestant === weakestContestant) {
      setCorrect(hostName + ': ' + clue.response.correct_response);
      if (lastCorrectContestant !== playerName) {
        console.log('triple stumper');
        setTimeout(() => setMessage(lastCorrectContestant + ': ' + message), 2000);
        setTimeout(() => displayNextClue(), 4000);
      }
      return;
    }
    // handle incorrect responses
    if (incorrectContestants.length > 0) {
      for (let i = 0; i < incorrectContestants.length; i++) {
        setMessage(incorrectContestants[i] + ': What is ' + clue.response.incorrect_responses[i] + '?');
        setCorrect(hostName + ': No');
        scores_copy[incorrectContestants[i]] -= scoreChange;
        setScores(scores_copy);
      }
    }
    // handle correct response
    if (correctContestant && correctContestant !== weakestContestant) {
      scores_copy[correctContestant] += scoreChange;
      setScores(scores_copy);
      setMessage(correctContestant + ': What is ' + clue.response.correct_response + '?');
      setCorrect(hostName + ': Yes! ' + message);
      setTimeout(() => displayNextClue(), 3000);
    }
  }

  function displayNextClue() {
    setMessage('');
    setCorrect('');
    console.log('displayNextClue');
    const nextClueNumber = getNextClueNumber();
    if (nextClueNumber > 0) {
      console.log(nextClueNumber);
      displayClueByNumber(nextClueNumber);
    } else {
      setMessage('End of round');
    }
  }

  function displayClue(row, col) {
    turnOffLight();
    setMessage('');
    setCorrect('');
    setSeconds(0);
    setResponseCountdown(5);
    setSelectedClue(board[col][row]);
    updateAvailableClueNumbers(selectedClue.number);
    let visibleCopy = [...visible];
    if (visibleCopy[row][col] !== undefined) {
      visibleCopy[row][col] = true;
      setVisible(visibleCopy);
      readClue(row, col);
    }
  }

  function displayClueByNumber(clueNumber) {
    console.log('displayClueByNumber ' + clueNumber);
    turnOffLight();
    updateAvailableClueNumbers(clueNumber);
    let visibleCopy = [...visible];
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 5; row++) {
        if (board[col][row].number === clueNumber) {
          visibleCopy[row][col] = true;
          setVisible(visibleCopy);
          readClue(row, col);
          const clue = getClue(clueNumber);
          setSelectedClue(clue);
        }
      }
    }
  }

  function getNextClueNumber() {
    for (let i = 1; i <= 30; i++) {
      if (availableClueNumbers[i] === true) {
        return i;
      }
    }
    return -1;
  }

  function updateAvailableClueNumbers(clueNumber) {
    let availableClueNumbersCopy = [...availableClueNumbers];
    availableClueNumbersCopy[clueNumber] = false;
    setAvailableClueNumbers(availableClueNumbersCopy);
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

  function readClue(row, col) {
    const clue = showData.jeopardy_round[col][row];
    msg.text = clue.text;
    window.speechSynthesis.speak(msg);
    msg.addEventListener('end', () => clearClue(row, col));
    msg.removeEventListener('end', () => clearClue(row, col));
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
        default:
          return 0;
      }
    } else if (round === 2) {
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
        default:
          return 0;
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

  function showAnswer() {
    setResponseTimerIsActive(false);
    setResponseCountdownIsActive(false);
    setCorrect(selectedClue.response.correct_response);
  }

  function incrementScore() {
    setResponseTimerIsActive(false);
    msg.text = 'Correct';
    window.speechSynthesis.speak(msg);
    let scores_copy = {...scores};
    scores_copy[playerName] += selectedClue.value;
    setScores(scores_copy);
  }

  function deductScore() {
    setResponseCountdownIsActive(false);
    msg.text = 'No';
    window.speechSynthesis.speak(msg);
    let scores_copy = {...scores};
    scores_copy[playerName] -= selectedClue.value;
    setScores(scores_copy);
  }

  function concede() {
    setResponseTimerIsActive(false);
    updateOpponentScores(selectedClue);
  }

  function readText(text) {
    msg.text = text;
    window.speechSynthesis.speak(msg);
  }

  function isTripleStumper() {
    const correctContestant = selectedClue.response.correct_contestant;
    return correctContestant.length === 0 || correctContestant === weakestContestant;
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

  function initializeAvailableClueNumbers() {
    const numbers = [];
    for (let i = 1; i <= 30; i++) {
      numbers[i] = true;
    }
    return numbers;
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
        <button onClick={() => answer()}>Answer</button>
        <button onClick={() => showAnswer()}>Show Correct</button>
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
