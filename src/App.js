import './App.css';
import React, { useState, useEffect } from 'react';
import { BiShow } from 'react-icons/bi';
import { FcApprove } from 'react-icons/fc';
import { FcDisapprove } from 'react-icons/fc';
import { HiHandRaised } from 'react-icons/hi2';
import { BsFillFlagFill } from 'react-icons/bs';
import Podium from './Podium/Podium';
import Monitor from './Monitor/Monitor';
import FinalMusic from './Resources/final_jeopardy.mp3';

const playerName = 'Alan';
let availableClueNumbers = new Array(30).fill(true);
let showData = {};
let stats = { numCorrect: 0, numClues: 0, coryatScore: 0, battingAverage: 0 };
let weakestContestant = '';
let answeredContestants = [];
let finalResponse = '';
let wager = 0;
let seconds = 0;
let lastCorrectContestant = playerName;
let round = 0;
let responseInterval = {};
let isPlayerDailyDouble = false;
let conceded = false;
let responseCountdownIsActive = false;
let msg = new SpeechSynthesisUtterance();

const App = () => {
  const [board, setBoard] = useState(null);
  const [message, setMessage] = useState({ line1: '', line2: '' });
  const [contestants, setContestants] = useState(null);
  const [responseTimerIsActive, setResponseTimerIsActive] = useState(false);
  const [disableAnswer, setDisableAnswer] = useState(false);
  const [disableClue, setDisableClue] = useState(false);
  const [imageUrl, setImageUrl] = useState('logo');

  useEffect(() => {
    fetch('http://localhost:5000/game/1080')
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

  function startRound() {
    if (round === 0) {
      setImageUrl('');
      round = 1;
      displayClueByNumber(1);
    } else if (round === 1) {
      setUpDoubleJeopardyBoard();
    } else if (round === 1.5) {
      round = 2;
      displayClueByNumber(1);
    } else if (round === 2) {
      showFinalJeopardyCategory();
    }
  }

  function setUpDoubleJeopardyBoard() {
    setImageUrl('');
    round = 1.5;
    let thirdPlace = playerName;
    Object.keys(contestants).forEach(contestant => {
      if (contestants[contestant].score < thirdPlace) {
        thirdPlace = contestant;
      }
    });
    lastCorrectContestant = thirdPlace;
    setBoard(showData.double_jeopardy_round);
    availableClueNumbers = new Array(30).fill(true);
    setMessageLines('');
    setDisableAnswer(false);
  }

  const handleInputChange = event => {
    if (isNaN(event.target.value)) {
      finalResponse = event.target.value;
    } else {
      wager = event.target.value;
    }
  }

  function answer(row, col) {
    setDisableAnswer(true);
    setResponseTimerIsActive(false);
    let bonusProbability = 0;
    let incorrectContestants = board[col][row].response.incorrect_contestants
      .filter(contestant => contestant !== weakestContestant)
      .filter(contestant => !answeredContestants.includes(contestant));
    if (answeredContestants.length === 1) {
      bonusProbability = 0.166;
    }
    const probability = getProbability(board[col][row].value, round, bonusProbability);
    if (seconds < 3 && (answeredContestants.length === 2 || isFastestResponse(seconds, probability) || noAttempts(row, col) || noOpponentAttemptsRemaining(row, col))) {
      readText(playerName);
      responseCountdownIsActive = true;
      setBoardState(row, col, 'eye');
    } else {     
      if (board[col][row].visible === 'closed') {
        setMessageLines(board[col][row].response.correct_response);
      } else if (incorrectContestants.length === 0 && board[col][row].response.correct_contestant !== weakestContestant) {
        readText(board[col][row].response.correct_contestant);
      } else if (incorrectContestants.length > 0) {
        readText(incorrectContestants[0]);
      }
      updateOpponentScores(row, col);
    }
    clearInterval(responseInterval);
  }

  function noAttempts(row, col) {
    return isTripleStumper(row, col) && board[col][row].response.incorrect_contestants.length === 0;
  }

  function noOpponentAttemptsRemaining(row, col) {
    const incorrectContestants = board[col][row].response.incorrect_contestants.filter(contestant => contestant !== weakestContestant);
    return answeredContestants.length === incorrectContestants.length && isTripleStumper(row, col);
  }

  function isTripleStumper(row, col) {
    return !board[col][row].response.correct_contestant || board[col][row].response.correct_contestant === weakestContestant;
  }

  function setMessageLines(text1, text2 = '') {
    setMessage({
      line1: text1,
      line2: text2
    });
  }

  function handleIncorrectResponses(incorrectContestants, clue, scoreChange) {
    let incorrectMessage = '';
    clue.response.incorrect_responses = clue.response.incorrect_responses.filter(response =>
      !response.includes(weakestContestant + ':'));
    for (let i = 0; i < incorrectContestants.length; i++) {
      if (incorrectContestants[i] !== weakestContestant && !answeredContestants.includes(incorrectContestants[i])) {
        incorrectMessage += clue.response.incorrect_responses[i];
        contestants[incorrectContestants[i]].score -= scoreChange;
        answeredContestants.push(incorrectContestants[i]);
        readText('No');
        seconds = 0;
        // keep the buzzer disabled for 500ms
        setTimeout(() => {
          setDisableAnswer(false);
          setResponseTimerIsActive(true);
        }, 500);
      }
      break;
    }
    if (clue.daily_double_wager > 0 || conceded) {
      setMessageLines(incorrectMessage, clue.response.correct_response);
    } else {
      setMessageLines(incorrectMessage);
    }
    setContestants(contestants);

  }

  function handleCorrectResponse(correctContestant, scoreChange, clue, nextClueNumber, nextClue, row, col) {
    lastCorrectContestant = correctContestant;
    contestants[correctContestant].score += scoreChange;
    setContestants(contestants);
    setBoardState(row, col, 'closed');
    setMessageLines(correctContestant + ': What is ' + clue.response.correct_response + '?');
    if (nextClueNumber > 0 && nextClue) {
      setTimeout(() => {
        setMessageLines(correctContestant + ': ' + nextClue.category + ' for $' + nextClue.value);
      }, 2000);
      seconds = 0;
      setTimeout(() => displayNextClue(), 4000);
    }
  }

  function getOpponentDailyDoubleWager(clue) {
    // don't change opponent score if this is not the same opponent who answered
    // the daily double in the actual broadcast game 
    if (clue.response.correct_contestant && clue.response.correct_contestant !== lastCorrectContestant) {
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

  function updateOpponentScores(row, col) {
    const clue = board[col][row];
    // don't update opponent score if this is the player's daily double
    if (isPlayerDailyDouble) {
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
      .filter(contestant => contestant !== weakestContestant)
      .filter(contestant => !answeredContestants.includes(contestant));
    let correctContestant = clue.response.correct_contestant;
    if (correctContestant === weakestContestant) {
      correctContestant = '';
    }
    let scoreChange = clue.daily_double_wager > 0 ? getOpponentDailyDoubleWager(clue) : clue.value;
    // handle triple stumpers
    if (!correctContestant) {
      if (incorrectContestants.length > 0) {
        handleIncorrectResponses(incorrectContestants, clue, scoreChange);
      } else {
        setMessageLines(clue.response.correct_response);
      }
      // go to next clue selected by opponent
      if (nextClueNumber > 0 && lastCorrectContestant !== playerName && clue.visible === 'closed') {
        setTimeout(() => setMessageLines(message), 2500);
        setTimeout(() => displayNextClue(), 4500);
      }
    } else if (incorrectContestants.length > 0) {
      handleIncorrectResponses(incorrectContestants, clue, scoreChange);
      if (conceded) {
        setTimeout(() => handleCorrectResponse(correctContestant, scoreChange, clue, nextClueNumber, nextClue, row, col), 3000);
      }
    } else { // no incorrect responses
      handleCorrectResponse(correctContestant, scoreChange, clue, nextClueNumber, nextClue, row, col);
    }
  }

  function displayNextClue() {
    setResponseTimerIsActive(false);
    answeredContestants = [];
    setMessageLines('');
    const nextClueNumber = getNextClueNumber();
    if (nextClueNumber > 0) {
      displayClueByNumber(nextClueNumber);
    } else {
      setImageUrl('logo');
    }
  }

  function displayClueImage(row, col) {
    const url = board[col][row].url;
    if (url) {
      setImageUrl(url);
    } else {
      setImageUrl('');
    }
  }

  function displayClue(row, col) {
    if (round === 0) {
      round = 1;
    }
    if (round === 1.5) {
      round = 2;
    }
    conceded = false;
    setDisableAnswer(false);
    answeredContestants = [];
    lastCorrectContestant = playerName;
    const clue = board[col][row];
    if (clue.daily_double_wager > 0) {
      isPlayerDailyDouble = true;
      wager = contestants[playerName].score;
      setBoardState(row, col, 'wager');
      readText('Answer. Daily double. How much will you wager');
      setMessageLines('Daily Double!');
    } else {
      setMessageLines('');
      seconds = 0;
      responseCountdownIsActive = false;
      updateAvailableClueNumbers(clue.number);
      setBoardState(row, col, 'clue');
      readClue(row, col);
    }
  }

  function displayClueByNumber(clueNumber) {
    conceded = false;
    setDisableAnswer(false);
    answeredContestants = [];
    updateAvailableClueNumbers(clueNumber);
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 5; row++) {
        if (board[col][row].number === clueNumber) {
          if (!isPlayerDailyDouble && board[col][row].daily_double_wager > 0) {
            isPlayerDailyDouble = false;
            if (lastCorrectContestant !== playerName) {
              setMessageLines('Daily Double', lastCorrectContestant + ': I will wager $' + board[col][row].daily_double_wager);
            }
          }
          setBoardState(row, col, 'clue');
          if (isPlayerDailyDouble) {
            setMessageLines(board[col][row].text);
          }
          readClue(row, col);
          return;
        }
      }
    }
  }

  function getNextClueNumber() {
    for (let i = 1; i <= 30; i++) {
      if (availableClueNumbers[i - 1] === true) {
        const clue = getClue(i);
        // if this is a daily double that was not answered by the contestant in the televised game, skip this clue
        if (clue && clue.daily_double_wager > 0 && !isContestantsDailyDouble(clue, lastCorrectContestant)) {
          continue;
        }
        return i;
      }
    }
    return -1;
  }

  function isContestantsDailyDouble(clue, contestant) {
    return clue.response.correct_contestant === contestant || clue.response.incorrect_contestants.includes(contestant);
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
    setDisableClue(true);
    stats.numClues += 1;
    let clue;
    if (round === 1) {
      clue = showData.jeopardy_round[col][row];
    } else if (round === 2 || round === 1.5) {
      clue = showData.double_jeopardy_round[col][row];
    }
    displayClueImage(row, col);
    msg.text = clue.text;
    window.speechSynthesis.speak(msg);
    msg.addEventListener('end', function clearClue() {
      setImageUrl('');
      seconds = 0;
      if (isPlayerDailyDouble && board[col][row].daily_double_wager > 0) {
        setBoardState(row, col, 'eye');
      } else if (board[col][row].daily_double_wager > 0) {
        concede(row, col);
      } else if (board[col][row].visible === 'clue') {
        setBoardState(row, col, 'buzzer');
      }
      setResponseTimerIsActive(true);
      msg.removeEventListener('end', clearClue, true);
    }, true);
  }

  function setBoardState(row, col, state) {
    const board_copy = [...board];
    board_copy[col][row].visible = state;
    setBoard(board_copy);
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

  function incrementScore(row, col) {
    setDisableClue(false);
    lastCorrectContestant = playerName;
    msg.text = 'Correct';
    window.speechSynthesis.speak(msg);
    if (board[col][row].daily_double_wager > 0) {
      contestants[playerName].score += +wager;
    } else {
      contestants[playerName].score += board[col][row].value;
    }
    setContestants(contestants);
    stats.coryatScore += board[col][row].value;
    stats.numCorrect += 1;
    resetClue(row, col);
  }

  function deductScore(row, col) {
    msg.text = 'No';
    window.speechSynthesis.speak(msg);
    if (board[col][row].daily_double_wager > 0) {
      contestants[playerName].score -= wager;
    } else {
      contestants[playerName].score -= board[col][row].value;
      stats.coryatScore -= board[col][row].value;
    }
    setContestants(contestants);
    if (!isPlayerDailyDouble) {
      updateOpponentScores(row, col);
    }
    resetClue(row, col);
    setDisableClue(false);
  }

  function resetClue(row, col) {
    isPlayerDailyDouble = false;
    setBoardState(row, col, 'closed');
    setResponseTimerIsActive(false);
    responseCountdownIsActive = false;
  }

  function concede(row, col) {
    setBoardState(row, col, 'closed');
    setResponseTimerIsActive(false);
    conceded = true;
    updateOpponentScores(row, col);
    if (lastCorrectContestant === playerName) {
      setDisableClue(false);
    }
  }

  function showAnswer(row, col) {
    setResponseTimerIsActive(false);
    responseCountdownIsActive = false;
    setBoardState(row, col, 'judge');
    if (round === 3) {
      setMessageLines(showData.final_jeopardy.correct_response);
    } else {
      setMessageLines(board[col][row].response.correct_response);
    }
  }


  function readText(text) {
    msg.text = text;
    window.speechSynthesis.speak(msg);
  }

  function submit(row, col) {
    if (round === 3) {
      document.getElementById('final-input').value = null;
      setDisableAnswer(true);
      responseCountdownIsActive = false;
      setContestants(contestants);
      showFinalJeopardyClue();
    } else {
      setBoardState(row, col, 'clue');
      displayClueByNumber(board[col][row].number);
    }
  }

  function showFinalJeopardyCategory() {
    round = 3;
    setDisableAnswer(false);
    setMessageLines('');
    msg.text = 'The final jeopardy category is ' + showData.final_jeopardy.category + '. How much will you wager';
    window.speechSynthesis.speak(msg);
  }

  function showFinalJeopardyClue() {
    let finalMusic = new Audio(FinalMusic);
    setBoardState(1, 3, 'final');
    setImageUrl(showData.final_jeopardy.url);
    msg.text = showData.final_jeopardy.clue;
    window.speechSynthesis.speak(msg);
    msg.addEventListener('end', () => {
      finalMusic.play();
    });
    finalMusic.addEventListener('ended', () => {
      showFinalJeopardyResults();
    });
  }

  function showFinalJeopardyResults() {
    stats.battingAverage = stats.numCorrect / stats.numClues * 1.0;
    console.log(stats);
    contestants[playerName].response = finalResponse;
    contestants[playerName].wager = wager;
    Object.keys(contestants).forEach(contestant => {
      showData.final_jeopardy.contestant_responses.forEach(response => {
        if (response.contestant === contestant) {
          contestants[contestant].response = response.response;
          contestants[contestant].wager = 0;
          if (contestants[contestant].score >= response.wager) {
            contestants[contestant].wager = response.wager;
          } else {
            contestants[contestant].wager = contestants[contestant].score;
          }
        }
      });
    });
    setContestants(contestants);
    setImageUrl('');
    setMessageLines(showData.final_jeopardy.correct_response);
  }

  function getCategory(column) {
    let i = 0;
    while (i < column.length && !column[i].category) {
      i++;
    }
    return column[i].category;
  }

  if (!board) {
    return <span id='loading'>Loading game...</span>;
  }
  return (
    <div id='content'>
      <meta name='viewport' content='width=device-width, initial-scale=1' />
      <Podium contestants={contestants} startTimer={responseCountdownIsActive} playerName={playerName} />
      <div id='monitor-container' onClick={() => startRound()}>
        <Monitor message={message} imageUrl={imageUrl}  />
      </div>     
      <table id='board'>
        <thead>
          <tr id='headers'>
            {Array.from(Array(6), (_arrayElement, row) =>
              <th key={'header' + row}>{round !== 3 && getCategory(board[row])}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from(Array(5), (_arrayElement, row) =>
            <tr key={'row' + row}>
              {board.map((category, column) =>
                <td key={'column' + column}>
                  {!category[row].visible && <div className='clue' onClick={() => displayClue(row, column)} disabled={disableClue}>${category[row].value}</div>}
                  <span>{category[row] && category[row].visible === 'clue' && category[row].text}</span>
                  {category[row].visible === 'buzzer' && category[row].daily_double_wager === 0 &&
                    <div className='clue'>
                      <button className='buzzer-button' onClick={() => answer(row, column)} disabled={disableAnswer}><HiHandRaised /></button>
                      <button className='flag-button' onClick={() => concede(row, column)}><BsFillFlagFill /></button>
                    </div>
                  }
                  {category[row].visible === 'eye' &&
                    <div>
                      <button className='eye-button' onClick={() => showAnswer(row, column)}><BiShow /></button>
                    </div>
                  }
                  {category[row].visible === 'judge' &&
                    <div className='clue'>
                      <button className='answer-button' onClick={() => incrementScore(row, column)}><FcApprove /></button>
                      <button className='answer-button' onClick={() => deductScore(row, column)}><FcDisapprove /></button>
                    </div>
                  }
                  {category[row].visible === 'wager' &&
                    <div>
                      ENTER YOUR WAGER:
                      <div className='wager'>
                        <button className='submit-button' onClick={() => submit(row, column)}>SUBMIT</button>
                        <input defaultValue={wager} onChange={handleInputChange} />
                      </div>
                    </div>
                  }
                  {round === 3 && row === 1 && column === 3 && category[row].visible !== 'final' &&
                    <h3>
                      {showData.final_jeopardy.category}
                    </h3>
                  }
                  {row === 1 && column === 3 && category[row].visible === 'final' &&
                    <div>
                      {showData.final_jeopardy.clue.toUpperCase()}
                    </div>
                  }
                  {round === 3 && row === 2 && column === 3 &&
                    <div>
                      {board[3][1].visible !== 'final' && <span>ENTER YOUR WAGER:</span>}
                      {board[3][1].visible === 'final' && <span>ENTER YOUR RESPONSE:</span>}
                      <div className='wager'>
                        {board[3][1].visible !== 'final' && <button id='final-submit-button' className='submit-button' disabled={disableAnswer} onClick={() => submit()}>SUBMIT</button>}
                        <input id="final-input" defaultValue={wager} onChange={handleInputChange} />
                      </div>
                    </div>
                  }
                </td>
              )}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;
