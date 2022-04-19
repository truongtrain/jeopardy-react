import './App.css';
import React, { useState, useEffect } from 'react';
import showData from './jeopardy.json';
import Banner from './Banner';

let msg = new SpeechSynthesisUtterance();
msg.rate = 0.9;
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
  contestants.forEach(contestant => {
    initalScores[contestant] = 0;
  });
  initalScores[playerName] = 0;
  
  const [visible, setVisible] = useState(getDefaultVisible());
  const [board, setBoard] = useState(showData.jeopardy_round);
  const [tableStyle, setTableStyle] = useState('table-light-off');
  const [message, setMessage] = useState('');
  const [message2, setMessage2] = useState('');
  const [scores, setScores] = useState(initalScores);
  const [seconds, setSeconds] = useState(0.0);
  const [responseCountdown, setResponseCountdown] = useState(5);
  const [responseCountdownIsActive, setResponseCountdownIsActive] = useState(false);
  const [responseTimerIsActive, setResponseTimerIsActive] = useState(false);
  const [availableClueNumbers, setAvailableClueNumbers] = useState(initializeAvailableClueNumbers());
  const [selectedClue, setSelectedClue] = useState(getClue(1));
  const [lastCorrectContestant, setLastCorrectContestant] = useState(playerName);
  const [round, setRound] = useState(1);
  const [wager, setWager] = useState(0);
  const [finalResponse, setFinalResponse] = useState('');
  const [finalResponses, setFinalResponses] = useState({});
  const [finalWagers, setFinalWagers] = useState({});

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

  function startRound() {
    setVisible(getDefaultVisible());
    displayClueByNumber(1);
  }

  const handleInputChange = event => {
    if (isNaN(event.target.value)) {
      setFinalResponse(event.target.value);
    } else {
      setWager(event.target.value);
    }
  }

  function answer() {
    setResponseTimerIsActive(false);
    const probability = getProbability(selectedClue.value, round);
    if (isFastestResponse(seconds, probability) || isTripleStumper()) {
      readText(playerName);
      setResponseCountdownIsActive(true);
    } else if (selectedClue.response.correct_contestant !== weakestContestant) {
      readText(selectedClue.response.correct_contestant);
      updateOpponentScores(selectedClue);
    } else {
      setMessage(selectedClue.response.correct_response);
    }
    clearInterval(responseInterval);
  }

  function handleIncorrectResponses(incorrectContestants, clue, scores_copy, scoreChange) {
    let incorrectMessage = '';
    for (let i = 0; i < incorrectContestants.length; i++) {
      if (incorrectContestants[i] !== weakestContestant) {
        incorrectMessage += incorrectContestants[i] + ': What is ' + clue.response.incorrect_responses[i] + '? '
        scores_copy[incorrectContestants[i]] -= scoreChange;
      }
    }
    setMessage(incorrectMessage);
    setMessage2(hostName + ': No');
    setScores(scores_copy);   
  }

  function handleCorrectResponse(correctContestant, scores_copy, scoreChange, clue, nextClueNumber, nextClue) {
    if (correctContestant && correctContestant !== weakestContestant) {
      setLastCorrectContestant(correctContestant);
      scores_copy[correctContestant] += scoreChange;
      setScores(scores_copy);
      setMessage(correctContestant + ': What is ' + clue.response.correct_response + '?');
      setMessage2(hostName + ': Yes! ');
      if (nextClueNumber > 0) {
        setTimeout(() => {
          setMessage(correctContestant + ': ' + nextClue.category + ' for $' + nextClue.value);
          setMessage2('');
        }, 2000);
        setSeconds(0);
        setTimeout(() => displayNextClue(), 4000);
      }
    }
  }

  function updateOpponentScores(clue) {
    const nextClueNumber = getNextClueNumber();
    let message;
    let nextClue;
    if (nextClueNumber > 0) {
      nextClue = getClue(nextClueNumber);
      message = lastCorrectContestant + ': ' + nextClue.category + ' for $' + nextClue.value;
    }
    const incorrectContestants = clue.response.incorrect_contestants;
    const correctContestant = clue.response.correct_contestant;
    let scores_copy = { ...scores };
    let scoreChange = clue.daily_double_wager > 0 ? clue.daily_double_wager : clue.value;
    // handle triple stumpers
    if (!correctContestant || correctContestant === weakestContestant) {
      if (incorrectContestants.length > 0) {
        handleIncorrectResponses(incorrectContestants, clue, scores_copy, scoreChange);
      } else {
        setMessage(hostName + ': ' + clue.response.correct_response);
      }
      if (nextClueNumber > 0 && lastCorrectContestant !== playerName) {
        setTimeout(() => setMessage(message), 2500);
        setTimeout(() => displayNextClue(), 4500);
      }
      return;
    }
    if (incorrectContestants.length > 0) {
      handleIncorrectResponses(incorrectContestants, clue, scores_copy, scoreChange);
      setTimeout(() => handleCorrectResponse(correctContestant, scores_copy, scoreChange, clue, nextClueNumber, nextClue), 3000);
    } else {
      handleCorrectResponse(correctContestant, scores_copy, scoreChange, clue, nextClueNumber, nextClue);
    }
  }

  function displayNextClue() {
    setMessage('');
    setMessage2('');
    const nextClueNumber = getNextClueNumber();
    console.log(nextClueNumber);
    if (nextClueNumber > 0) {
      displayClueByNumber(nextClueNumber);
    } else {
      setMessage('End of round');
    }
  }

  function displayClue(row, col) {
    turnOffLight();
    setLastCorrectContestant(playerName);
    const clue = board[col][row];
    setSelectedClue(clue);
    if (clue.daily_double_wager > 0) {
      readText('Answer. Daily double. How much will you wager');
      setMessage('Daily Double!');
    } else {
      setMessage('');
      setMessage2('');
      setSeconds(0);
      setResponseCountdown(5);
      updateAvailableClueNumbers(clue.number);
      let visibleCopy = [...visible];
      if (visibleCopy[row][col] !== undefined) {
        visibleCopy[row][col] = true;
        setVisible(visibleCopy);
        readClue(row, col);
      }
    }
  }

  function displayClueByNumber(clueNumber) {
    turnOffLight();
    updateAvailableClueNumbers(clueNumber);
    let visibleCopy = [...visible];
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 5; row++) {
        if (board[col][row].number === clueNumber) {
          if (board[col][row].daily_double_wager > 0) {
            setMessage('Answer. Daily Double');
            setMessage2(lastCorrectContestant + ': I will wager $' + board[col][row].daily_double_wager);
          }
          visibleCopy[row][col] = true;
          setVisible(visibleCopy);
          readClue(row, col);
          const clue = getClue(clueNumber);
          setSelectedClue(clue);
          return;
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
    let clue;
    if (round === 1) {
      clue = showData.jeopardy_round[col][row];
    } else if (round === 2) {
      clue = showData.double_jeopardy_round[col][row];
    }
    msg.text = clue.text;
    window.speechSynthesis.speak(msg);
    msg.addEventListener('end', () => clearClue(row, col));
    msg.removeEventListener('end', () => clearClue(row, col));
  }

  function clearClue(row, col) {
    setSeconds(0);
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
    if (round === 3) {
      setMessage2(showData.final_jeopardy.correct_response);
    } else {
      setMessage2(selectedClue.response.correct_response);
    }
  }

  function incrementScore() {
    setResponseTimerIsActive(false);
    setLastCorrectContestant(playerName);
    msg.text = 'Correct';
    window.speechSynthesis.speak(msg);
    let scores_copy = { ...scores };
    if (selectedClue.daily_double_wager > 0) {
      scores_copy[playerName] += +wager;
    } else {
      scores_copy[playerName] += selectedClue.value;
    }
    setScores(scores_copy);
  }

  function deductScore() {
    setResponseCountdownIsActive(false);
    msg.text = 'No';
    window.speechSynthesis.speak(msg);
    let scores_copy = { ...scores };
    if (selectedClue.daily_double_wager > 0) {
      scores_copy[playerName] -= wager;
    } else {
      scores_copy[playerName] -= selectedClue.value;
    }
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

  function submit() {
    if (round === 3) {
      setResponseCountdownIsActive(false);
      finalResponses[playerName] = finalResponse;
      finalWagers[playerName] = wager;
    } else {
      displayClueByNumber(selectedClue.number);
    }
  }

  function startDoubleJeopardyRound() {
    setRound(2);
    let thirdPlace = scores[playerName]
    contestants.forEach(contestant => {
      if (scores[contestant] < thirdPlace) {
        thirdPlace = scores[contestant];
      }
    });
    setLastCorrectContestant(thirdPlace);
    setBoard(showData.double_jeopardy_round);
    setVisible(getDefaultVisible());
    setAvailableClueNumbers(initializeAvailableClueNumbers());
    setMessage('');
    setMessage2('');
  }

  function showFinalJeopardyCategory() {
    setRound(3);
    setMessage(showData.final_jeopardy.category)
    setMessage2('Enter your wager');
  }

  function showFinalJeopardyClue() {
    setMessage2(showData.final_jeopardy.clue);
    msg.text = showData.final_jeopardy.clue;
    window.speechSynthesis.speak(msg);
    msg.addEventListener('end', () => {
      setResponseCountdown(30);
      setResponseCountdownIsActive(true);
    });
  }

  function showFinalJeopardyResults() {
    let responses = [];
    let wagers = [];
    contestants.forEach(contestant => {
      showData.final_jeopardy.contestant_responses.forEach(response => {
        if (response.contestant === contestant) {
          responses[contestant] = response.response;
          wagers[contestant] = response.wager;
        }
      });
    });
    responses[playerName] = finalResponse;
    wagers[playerName] = wager;
    setFinalResponses(responses);
    setFinalWagers(wagers);
    setMessage(showData.final_jeopardy.correct_response);
  }

  return (
    <div>
      <Banner contestants={contestants}
        correct={message2}
        message={message}
        scores={scores}
        responses={finalResponses}
        wagers={finalWagers} />

      <div className='banner'>
        <div>{responseCountdown.toFixed(1)}</div>
        <button onClick={() => concede()}>Concede</button>
        <button onClick={() => answer()}>Answer</button>
        <button onClick={() => showAnswer()}>Show Correct</button>
        <button onClick={() => incrementScore()}>Correct</button>
        <button onClick={() => deductScore()}>Incorrect</button>
        <button onClick={() => submit()}>Submit</button>
        <input id="wager" onChange={handleInputChange} />
        <button onClick={() => startDoubleJeopardyRound()}>Double Jeopardy</button>
        <button onClick={() => showFinalJeopardyCategory()}>Final Jeopardy Category</button>
        <button onClick={() => showFinalJeopardyClue()}>Final Jeopardy Clue</button>
        <button onClick={() => showFinalJeopardyResults()}>Results</button>
        <button onClick={() => startRound()}>Start Round</button>
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
                  </td>)
              })}
            </tr>)
          })}
        </tbody>
      </table>
    </div>
  );
}

export default App;
