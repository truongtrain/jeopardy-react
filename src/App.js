import './App.css';
import React, { useState, useEffect } from 'react';
import Podium from './Podium/Podium';
import Message from './Message/Message';

const playerName = 'Alan';
const hostName = 'Trebek';
const availableClueNumbers = new Array(30).fill(true);
let showData = {};
let stats = { numCorrect: 0, numClues: 0, coryatScore: 0, battingAverage: 0 };
let weakestContestant = '';
let answeredContestants = [];
let wager = 0;
let finalResponse = '';
let seconds = 0;
let responseCountdownIsActive = false;
let responseTimerIsActive = false;
let lastCorrectContestant = playerName;
let round = 1;
let responseInterval = {};
let responseCountdownInterval = {};
let isPlayerDailyDouble = false;
let conceded = false;
let msg = new SpeechSynthesisUtterance();

const App = () => {
  const [board, setBoard] = useState(null);
  const [tableStyle, setTableStyle] = useState('table-light-off');
  const [message, setMessage] = useState({ line1: '', line2: '' });
  const [responseCountdown, setResponseCountdown] = useState(5);
  const [selectedClue, setSelectedClue] = useState(null);
  const [contestants, setContestants] = useState(null);
  const [disableAnswer, setDisableAnswer] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/example')
      .then((res) => res.json())
      .then((data) => {
        showData = data;
        weakestContestant = showData.weakest_contestant;
        let filteredContestants = showData.contestants.filter(
          contestant => contestant !== weakestContestant
        );
        filteredContestants.push(playerName);
        let tempContestants = {};
        filteredContestants.forEach(contestant => tempContestants[contestant] = { score: 0, response: '', wager: null });
        setContestants(tempContestants);
        setBoard(showData.jeopardy_round);
        setSelectedClue(getClue(1));
      })
  }, []);

  // determines how fast I click after the clue is read
  useEffect(() => {
    if (responseTimerIsActive) {
      responseInterval = setInterval(() => seconds += 0.01, 10);
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
    displayClueByNumber(1);
  }

  const handleInputChange = event => {
    if (isNaN(event.target.value)) {
      finalResponse = event.target.value;
    } else {
      wager = event.target.value;
    }
  }

  function answer() {
    setDisableAnswer(true);
    responseTimerIsActive = false;
    let bonusProbability = 0;
    let incorrectContestants = selectedClue.response.incorrect_contestants;
    if (answeredContestants.length === 1) {
      incorrectContestants = incorrectContestants
        .filter(contestant => contestant !== answeredContestants[0]);
      bonusProbability = 0.166;
    }
    const probability = getProbability(selectedClue.value, round, bonusProbability);
    if (answeredContestants.length === 2 || isFastestResponse(seconds, probability) || (seconds < 3 && isTripleStumper())) {
      readText(playerName);
      responseCountdownIsActive = true;
    } else if (selectedClue.response.correct_contestant !== weakestContestant) {
      if (!hasIncorrectContestants(incorrectContestants)) {
        readText(selectedClue.response.correct_contestant);
      } else {
        const incorrectContestant = getIncorrectContestant(incorrectContestants);
        readText(incorrectContestant);
      }
      updateOpponentScores(selectedClue);
    } else {
      setMessageLines(selectedClue.response.correct_response);
    }
    clearInterval(responseInterval);
  }

  function setMessageLines(text1, text2 = '') {
    setMessage({
      line1: text1,
      line2: text2
    });
  }

  function getIncorrectContestant(incorrectContestants) {
    const filteredContestants = incorrectContestants
      .filter(contestant => contestant !== weakestContestant);
    if (answeredContestants.length === 0) {
      return filteredContestants[0];
    }
    return filteredContestants[1];
  }

  function handleIncorrectResponses(incorrectContestants, clue, scoreChange) {
    let incorrectMessage = '';
    let answered = [];
    for (let i = 0; i < incorrectContestants.length; i++) {
      if (incorrectContestants[i] !== weakestContestant && !answered.includes(incorrectContestants[i])) {
        incorrectMessage += incorrectContestants[i] + ': What is ' + clue.response.incorrect_responses[i] + '? '
        contestants[incorrectContestants[i]].score -= scoreChange;
        answered.push(incorrectContestants[i]);
        answeredContestants = answered;
      }
    }
    setMessageLines(incorrectMessage, hostName + ': No. ' + clue.response.correct_response);
    setContestants(contestants);
  }

  function handleCorrectResponse(correctContestant, scoreChange, clue, nextClueNumber, nextClue) {
    if (correctContestant === clue.response.correct_contestant && correctContestant !== weakestContestant) {
      lastCorrectContestant = correctContestant;
      contestants[correctContestant].score += scoreChange;
      setContestants(contestants);
      setMessageLines(correctContestant + ': What is ' + clue.response.correct_response + '?', hostName + ': Yes! ');
      if (nextClueNumber > 0) {
        setTimeout(() => {
          setMessageLines(correctContestant + ': ' + nextClue.category + ' for $' + nextClue.value);
        }, 2000);
        seconds = 0;
        setTimeout(() => displayNextClue(), 4000);
      }
    }
  }

  function getOpponentDailyDoubleWager(clue) {
    // don't change opponent score if this is not the same opponent who answered
    // the daily double in the actual broadcast game 
    if (clue.response.correct_contestant !== lastCorrectContestant) {
      return 0;
    }
    const currentScore = contestants[lastCorrectContestant].score;
    if (round === 1) {
      if (clue.daily_double_wager > currentScore) {
        if (currentScore > 1000) {
          return currentScore;
        }
        return 1000;
      }
    } else if (round === 2) {
      if (clue.daily_double_wager > currentScore) {
        if (currentScore > 1000) {
          return currentScore;
        }
        return 2000;
      }
    }
    return clue.daily_double_wager;
  }

  function updateOpponentScores(clue) {
    // don't update opponent score if this is the player's daily double
    if (clue.daily_double_wager > 0 && isPlayerDailyDouble) {
      return;
    }
    const nextClueNumber = getNextClueNumber();
    let message;
    let nextClue;
    if (nextClueNumber > 0) {
      nextClue = getClue(nextClueNumber);
    }
    if (nextClue) {
      message = lastCorrectContestant + ': ' + nextClue.category + ' for $' + nextClue.value;
    }
    const incorrectContestants = clue.response.incorrect_contestants
      .filter(contestant => !answeredContestants.includes(contestant));
    const correctContestant = clue.response.correct_contestant;
    let scoreChange = clue.daily_double_wager > 0 ? getOpponentDailyDoubleWager(clue) : clue.value;
    // handle triple stumpers
    if (!correctContestant || correctContestant === weakestContestant) {
      if (hasIncorrectContestants(incorrectContestants)) {
        handleIncorrectResponses(incorrectContestants, clue, scoreChange);
      } else {
        setMessageLines(hostName + ': ' + clue.response.correct_response);
      }
      if (nextClueNumber > 0 && lastCorrectContestant !== playerName) {
        setTimeout(() => setMessageLines(message), 2500);
        setTimeout(() => displayNextClue(), 4500);
      }
      return;
    }
    if (hasIncorrectContestants(incorrectContestants)) {
      handleIncorrectResponses(incorrectContestants, clue, scoreChange);
      if (conceded) {
        setTimeout(() => handleCorrectResponse(correctContestant, scoreChange, clue, nextClueNumber, nextClue), 3000);
      }
    } else {
      handleCorrectResponse(correctContestant, scoreChange, clue, nextClueNumber, nextClue);
    }
  }

  function hasIncorrectContestants(incorrectContestants) {
    incorrectContestants = incorrectContestants
      .filter(contestant => contestant !== weakestContestant);
    return incorrectContestants.length > 0;
  }

  function displayNextClue() {
    answeredContestants = [];
    setMessageLines('');
    const nextClueNumber = getNextClueNumber();
    if (nextClueNumber > 0) {
      displayClueByNumber(nextClueNumber);
    } else {
      setMessageLines('End of round');
    }
  }

  function displayClue(row, col) {
    turnOffLight();
    stats.numClues += 1;
    lastCorrectContestant = playerName;
    const clue = board[col][row];
    setSelectedClue(clue);
    if (clue.daily_double_wager > 0) {
      isPlayerDailyDouble = true;
      readText('Answer. Daily double. How much will you wager');
      setMessageLines('Daily Double!');
    } else {
      setMessageLines('');
      seconds = 0;
      setResponseCountdown(5);
      updateAvailableClueNumbers(clue.number);
      board[col][row].visible = true;
      setBoard(board);
      readClue(row, col);
    }
  }

  function displayClueByNumber(clueNumber) {
    turnOffLight();
    stats.numClues += 1;
    updateAvailableClueNumbers(clueNumber);
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 5; row++) {
        if (board[col][row].number === clueNumber) {
          if (board[col][row].daily_double_wager > 0) {
            isPlayerDailyDouble = false;
            setMessageLines('Answer. Daily Double');
            if (lastCorrectContestant !== playerName) {
              setMessageLines(lastCorrectContestant + ': I will wager $' + board[col][row].daily_double_wager);
            } else {
              setMessageLines(board[col][row].text);
            }
          }
          board[col][row].visible = true;
          setBoard(board);
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
      if (availableClueNumbers[i - 1] === true) {
        return i;
      }
    }
    return -1;
  }

  function updateAvailableClueNumbers(clueNumber) {
    availableClueNumbers[clueNumber - 1] = false;
  }

  function getClue(clueNumber) {
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 5; row++) {
        if (board && board[col][row].number === clueNumber) {
          return board[col][row];
        }
      }
    }
    return null;
  }

  function readClue(row, col) {
    let clue;
    if (round === 1) {
      console.log(showData);
      console.log(row);
      console.log(col);
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
    seconds = 0;
    let board_copy = [...board];
    board_copy[col][row].text = '';
    setBoard(board_copy);
    turnOnLight();
    responseTimerIsActive = true;
  }

  function getProbability(value, round, bonusProbability) {
    if (round === 1) {
      switch (value) {
        case 200:
          return 0.424 + bonusProbability;
        case 400:
          return 0.492 + bonusProbability;
        case 600:
          return 0.500 + bonusProbability;
        case 800:
          return 0.541 + bonusProbability;
        case 1000:
          return 0.636 + bonusProbability;
        default:
          return 0;
      }
    } else if (round === 2) {
      switch (value) {
        case 400:
          return 0.452 + bonusProbability;
        case 800:
          return 0.535 + bonusProbability;
        case 1200:
          return 0.563 + bonusProbability;
        case 1600:
          return 0.623 + bonusProbability;
        case 2000:
          return 0.704 + bonusProbability;
        default:
          return 0;
      }
    }
  }

  function isFastestResponse(seconds, probability) {
    const randomNumber = Math.random();
    seconds %= 5;
    console.log('answer: ' + selectedClue.response.correct_response);
    console.log('seconds: ' + seconds);
    console.log('randomNumber: ' + randomNumber);
    let adjustedProbability;
    if (seconds <= 0.1) {
      adjustedProbability = Math.pow(probability, 0.5);
    } else if (seconds <= 0.2) {
      adjustedProbability = probability;
    } else if (seconds <= 0.4) {
      adjustedProbability = Math.pow(probability, 2);
    } else if (seconds <= 0.6) {
      adjustedProbability = Math.pow(probability, 3);
    } else if (seconds <= 0.8) {
      adjustedProbability = Math.pow(probability, 4);
    } else if (seconds <= 1) {
      adjustedProbability = Math.pow(probability, 5);
    } else if (seconds <= 1.25) {
      adjustedProbability = Math.pow(probability, 6);
    } else if (seconds <= 1.5) {
      adjustedProbability = Math.pow(probability, 7);
    } else if (seconds <= 1.75) {
      adjustedProbability = Math.pow(probability, 8);
    } else if (seconds <= 2) {
      adjustedProbability = Math.pow(probability, 9);
    } else if (seconds < 3) {
      adjustedProbability = Math.pow(probability, 10);
    }
    console.log('adjusted probablility: ' + adjustedProbability);
    console.log(randomNumber <= adjustedProbability);
    return randomNumber <= adjustedProbability;
  }

  function showAnswer() {
    responseTimerIsActive = false;
    responseCountdownIsActive = false;
    if (round === 3) {
      setMessageLines(showData.final_jeopardy.correct_response);
    } else {
      setMessageLines(selectedClue.response.correct_response);
    }
  }

  function incrementScore() {
    responseTimerIsActive = false;
    lastCorrectContestant = playerName;
    msg.text = 'Correct';
    window.speechSynthesis.speak(msg);
    if (selectedClue.daily_double_wager > 0) {
      contestants[playerName].score += +wager;
    } else {
      contestants[playerName].score += selectedClue.value;
    }
    setContestants(contestants);
    stats.coryatScore += selectedClue.value;
    stats.numCorrect += 1;
  }

  function deductScore() {
    responseCountdownIsActive = false;
    msg.text = 'No';
    window.speechSynthesis.speak(msg);
    if (selectedClue.daily_double_wager > 0) {
      contestants[playerName].score -= wager;
    } else {
      contestants[playerName].score -= selectedClue.value;
      stats.coryatScore -= selectedClue.value;
    }
    setContestants(contestants);
  }

  function concede() {
    responseTimerIsActive = false;
    conceded = true;
    updateOpponentScores(selectedClue);
  }

  function readText(text) {
    msg.text = text;
    window.speechSynthesis.speak(msg);
  }

  function isTripleStumper() {
    const correctContestant = selectedClue.response.correct_contestant;
    console.log('correctContestant: ' + correctContestant);
    return correctContestant.length === 0 || correctContestant === weakestContestant;
  }

  function turnOffLight() {
    answeredContestants = [];
    setDisableAnswer(true);
    setTableStyle('table-light-off');
  }

  function turnOnLight() {
    setDisableAnswer(false);
    setTableStyle('table-light-on');
  }

  function submit() {
    if (round === 3) {
      responseCountdownIsActive = false;
      contestants[playerName] = { response: finalResponse, wager: wager };
      setContestants(contestants);
    } else {
      displayClueByNumber(selectedClue.number);
    }
  }

  function startDoubleJeopardyRound() {
    round = 2;
    let thirdPlace = playerName;
    contestants.forEach(contestant => {
      if (contestants[contestant].score < thirdPlace) {
        thirdPlace = contestant;
      }
    });
    lastCorrectContestant = thirdPlace;
    setBoard(showData.double_jeopardy_round);
    availableClueNumbers = new Array(30).fill(true);
    setMessageLines('');
  }

  function showFinalJeopardyCategory() {
    round = 3;
    setMessageLines('Enter your wager', showData.final_jeopardy.category);
  }

  function showFinalJeopardyClue() {
    setMessageLines(showData.final_jeopardy.clue);
    msg.text = showData.final_jeopardy.clue;
    window.speechSynthesis.speak(msg);
    msg.addEventListener('end', () => {
      setResponseCountdown(30);
      responseCountdownIsActive = true;
    });
  }

  function showFinalJeopardyResults() {
    stats.battingAverage = stats.numCorrect / stats.numClues * 1.0;
    console.log(stats);
    contestants[playerName] = { response: finalResponse, wager: wager };
    Object.keys(contestants).forEach(contestant => {
      showData.final_jeopardy.contestant_responses.forEach(response => {
        if (response.contestant === contestant) {
          contestants[contestant] = { response: response.response, wager: 0 };
          if (contestants[contestant].score >= response.wager) {
            contestants[contestant].wager = response.wager;
          } else {
            contestants[contestant].wager = contestants[contestant].score;
          }
        }
      });
    });
    setContestants(contestants);
    setMessageLines(showData.final_jeopardy.correct_response, showData.final_jeopardy.clue);
  }

  function getCategory(column) {
    let i = 0;
    while (i < column.length && !column[i].category) {
      i++;
    }
    return column[i].category;
  }

  if (!board) {
    return <>Loading game...</>;
  }
  return (
    <div>
      <Message message={message} />
      <Podium contestants={contestants} />

      <div className='banner'>
        <div>{responseCountdown.toFixed(1)}</div>
        <button onClick={() => concede()}>Concede</button>
        <button onClick={() => answer()} disabled={disableAnswer}>Answer</button>
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
            {Array.from(Array(6), (_arrayElement, row) => {
              return (<th key={'header' + row}>{getCategory(board[row])}</th>)
            })}
          </tr>
        </thead>
        <tbody>
          {Array.from(Array(5), (_arrayElement, row) => {
            return (<tr key={'row' + row}>
              {board.map((category, column) => {
                return (
                  <td key={'column' + column}>
                    <span>{category[row] && category[row].visible && category[row].text}</span>
                    {
                      !category[row].visible && <button className='clue-button' onClick={() => displayClue(row, column)}>
                        ${category[row].value}
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
