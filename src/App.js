import './App.css';
import './index.scss';
import React, { useState, useEffect } from 'react';
import { BiShow } from 'react-icons/bi';

import { FcApprove } from 'react-icons/fc';
import { FcDisapprove } from 'react-icons/fc';
import { HiHandRaised } from 'react-icons/hi2';
import { BsFillFlagFill } from 'react-icons/bs';
import Podium from './components/Podium';

import Monitor from './components/Monitor';
import FinalMusic from './resources/final_jeopardy.mp3';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';
import Name from './components/Name';
import sampleGame from './resources/sample_game.json';

export const ScoreContext = React.createContext();

let availableClueNumbers = new Array(30).fill(true);
let showData = {};
let stats = { numCorrect: 0, numClues: 0, coryatScore: 0, battingAverage: 0 };
let player = { finalResponse: '', wager: 0, conceded: false};
let response = { seconds: 0, interval: {}, countdown: false};
let msg = new SpeechSynthesisUtterance();
let contestants = { weakest: '', answered: [], lastCorrect: '' };
let round = -1;

const App = () => {
  const [playerName, setPlayerName] = useState('');
  const [board, setBoard] = useState(null);
  const [message, setMessage] = useState({ line1: '', line2: '' });
  const [scores, setScores] = useState(null);
  const [responseTimerIsActive, setResponseTimerIsActive] = useState(false);
  const [disableAnswer, setDisableAnswer] = useState(false);
  const [disableClue, setDisableClue] = useState(false);
  const [imageUrl, setImageUrl] = useState('logo');
  const handle = useFullScreenHandle(); 

  useEffect(() => {
    fetch('http://localhost:5000/game/3766')
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        showData = data;
        setBoard(showData.jeopardy_round);
      },
      () => {
        // load sample game if service not available
        showData = sampleGame;
        setBoard(showData.jeopardy_round);
      })
  }, []);

  // determines how fast the player clicks after the clue is read
  useEffect(() => {
    if (responseTimerIsActive) {
      response.interval = setInterval(() => response.seconds += 0.01, 10);
    } else {
      clearInterval(response.interval);
    }
    return () => clearInterval(response.interval);
  }, [responseTimerIsActive]);

  function loadBoard(playerNameParam) {
    setPlayerName(playerNameParam);
    loadContestants(playerNameParam);
    setImageUrl('');
    round = 0;
  }

  function startRound() {
    if (round === 0) {
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

  function loadContestants(playerNameParam) {
    contestants.weakest = showData.weakest_contestant;
    let filteredContestants = showData.contestants.filter(
      contestant => contestant !== contestants.weakest
    );
    filteredContestants.push(playerNameParam);
    let tempContestants = {};
    filteredContestants.forEach(
      contestant => tempContestants[contestant] = { score: 0, response: '', wager: null }
    );
    setScores(tempContestants);
  }

  function setUpDoubleJeopardyBoard() {
    setImageUrl('');
    round = 1.5;
    let thirdPlace = playerName;
    Object.keys(scores).forEach(contestant => {
      if (scores[contestant].score < scores[thirdPlace].score) {
        thirdPlace = contestant;
      }
    });
    contestants.lastCorrect = thirdPlace;
    setBoard(showData.double_jeopardy_round);
    availableClueNumbers = new Array(30).fill(true);
    setMessageLines('');
    setDisableClue(false);
    setDisableAnswer(false);
  }

  const handleInputChange = event => {
    if (isNaN(event.target.value)) {
      player.finalResponse = event.target.value;
    } else {
      player.wager = event.target.value;
    }
  }

  function answer(row, col) {
    setDisableAnswer(true);
    setResponseTimerIsActive(false);
    let bonusProbability = 0;
    let incorrectContestants = board[col][row].response.incorrect_contestants
      .filter(contestant => contestant !== contestants.weakest)
      .filter(contestant => !contestants.answered.includes(contestant));
    if (contestants.answered.length === 1) {
      bonusProbability = 0.166; // increase the probability of a successful buzz-in if a contestant has already answered this clue
    }
    const probability = getProbability(board[col][row].value, round, bonusProbability);
    if (response.seconds < 3 && (contestants.answered.length === 2 || isFastestResponse(response.seconds, probability) || noAttempts(row, col) || noOpponentAttemptsRemaining(row, col))) {
      readText(playerName);
      response.countdown = true;
      setBoardState(row, col, 'eye');
    } else {
      if (board[col][row].visible === 'closed') {
        setMessageLines(board[col][row].response.correct_response);
      } else if (incorrectContestants.length === 0 && board[col][row].response.correct_contestant !== contestants.weakest) {
        readText(board[col][row].response.correct_contestant);
      } else if (incorrectContestants.length > 0) {
        readText(incorrectContestants[0]);
      }
      updateOpponentScores(row, col);
    }
    clearInterval(response.interval);
  }

  function noAttempts(row, col) {
    return isTripleStumper(row, col) && board[col][row].response.incorrect_contestants.length === 0;
  }

  function noOpponentAttemptsRemaining(row, col) {
    const incorrectContestants = board[col][row].response.incorrect_contestants.filter(contestant => contestant !== contestants.weakest);
    return contestants.answered.length === incorrectContestants.length && isTripleStumper(row, col);
  }

  function isTripleStumper(row, col) {
    return !board[col][row].response.correct_contestant || board[col][row].response.correct_contestant === contestants.weakest;
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
      !response.includes(contestants.weakest + ':'));
    for (let i = 0; i < incorrectContestants.length; i++) {
      if (incorrectContestants[i] !== contestants.weakest && !contestants.answered.includes(incorrectContestants[i])) {
        incorrectMessage += clue.response.incorrect_responses[i];
        scores[incorrectContestants[i]].score -= scoreChange;
        contestants.answered.push(incorrectContestants[i]);
        readText('No');
        response.seconds = 0;
      }
      break;
    }
    if (clue.daily_double_wager > 0 || player.conceded) {
      setMessageLines(incorrectMessage, clue.response.correct_response);
    } else {
      setMessageLines(incorrectMessage);
    }
    setScores(scores);

  }

  function handleCorrectResponse(correctContestant, scoreChange, clue, nextClueNumber, nextClue, row, col) {
    contestants.lastCorrect = correctContestant;
    scores[correctContestant].score += scoreChange;
    setScores(scores);
    setBoardState(row, col, 'closed');
    setMessageLines(correctContestant + ': What is ' + clue.response.correct_response + '?');
    if (nextClueNumber > 0 && nextClue) {
      setTimeout(() => {
        setMessageLines(correctContestant + ': ' + nextClue.category + ' for $' + nextClue.value);
      }, 2000);
      response.seconds = 0;
      setTimeout(() => displayNextClue(), 4000);
    }
  }

  function getOpponentDailyDoubleWager(clue) {
    // don't change opponent score if this is not the same opponent who answered
    // the daily double in the actual broadcast game 
    if (clue.response.correct_contestant && clue.response.correct_contestant !== contestants.lastCorrect) {
      return 0;
    }
    const currentScore = scores[contestants.lastCorrect].score;
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
    if (isPlayerDailyDouble(row, col)) {
      return;
    }
    const nextClueNumber = getNextClueNumber();
    let message;
    let nextClue;
    if (nextClueNumber > 0) {
      nextClue = getClue(nextClueNumber);
    }
    if (nextClue) {
      message = contestants.lastCorrect + ': ' + nextClue.category + ' for $' + nextClue.value;
    }
    const incorrectContestants = clue.response.incorrect_contestants
      .filter(contestant => contestant !== contestants.weakest)
      .filter(contestant => !contestants.answered.includes(contestant));
    let correctContestant = clue.response.correct_contestant;
    if (correctContestant === contestants.weakest) {
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
      if (nextClueNumber > 0 && contestants.lastCorrect !== playerName) {
        setTimeout(() => setMessageLines(message), 2500);
        setTimeout(() => displayNextClue(), 4500);
      }
    } else if (incorrectContestants.length > 0) {
      handleIncorrectResponses(incorrectContestants, clue, scoreChange);
      if (player.conceded) {
        setTimeout(() => handleCorrectResponse(correctContestant, scoreChange, clue, nextClueNumber, nextClue, row, col), 3000);
      }
    } else { // no incorrect responses
      handleCorrectResponse(correctContestant, scoreChange, clue, nextClueNumber, nextClue, row, col);
    }
  }

  function displayNextClue() {
    setResponseTimerIsActive(false);
    contestants.answered = [];
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
      setMessageLines('');
    } else {
      setImageUrl('');
    }
  }

  function enterFullScreen() {
    if (!handle.active && window.innerWidth > 1000) {
      handle.enter();
    }
  }

  function displayClue(row, col) {
    enterFullScreen();
    if (round === 0) {
      round = 1;
    }
    if (round === 1.5) {
      round = 2;
    }
    player.conceded = false;
    setDisableAnswer(false);
    contestants.answered = [];
    contestants.lastCorrect = playerName;
    const clue = board[col][row];
    if (clue.daily_double_wager > 0) {
      player.wager = scores[playerName].score;
      setBoardState(row, col, 'wager');
      readText('Answer. Daily double. How much will you wager');
    } else {
      setMessageLines('');
      response.seconds = 0;
      response.countdown = false;
      updateAvailableClueNumbers(clue.number);
      setBoardState(row, col, 'clue');
      readClue(row, col);
    }
  }

  function displayClueByNumber(clueNumber) {
    enterFullScreen();
    player.conceded = false;
    setDisableAnswer(false);
    contestants.answered = [];
    updateAvailableClueNumbers(clueNumber);
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 5; row++) {
        if (board[col][row].number === clueNumber) {
          if (!isPlayerDailyDouble(row, col) && board[col][row].daily_double_wager > 0) {
            if (contestants.lastCorrect !== playerName) {
              setMessageLines('Daily Double', contestants.lastCorrect + ': I will wager $' + board[col][row].daily_double_wager);
            }
          }
          setBoardState(row, col, 'clue');
          if (isPlayerDailyDouble(row, col) && !board[col][row].url) {
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
        if (clue && clue.daily_double_wager > 0 && !isContestantsDailyDouble(clue, contestants.lastCorrect)) {
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
      response.seconds = 0;
      if (isPlayerDailyDouble(row, col) && board[col][row].daily_double_wager > 0) {
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
    board[col][row].visible = state;
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
    contestants.lastCorrect = playerName;
    msg.text = 'Correct';
    window.speechSynthesis.speak(msg);
    if (board[col][row].daily_double_wager > 0) {
      scores[playerName].score += +player.wager;
    } else {
      scores[playerName].score += board[col][row].value;
    }
    setScores(scores);
    stats.coryatScore += board[col][row].value;
    stats.numCorrect += 1;
    resetClue(row, col);
  }

  function deductScore(row, col) {
    msg.text = 'No';
    window.speechSynthesis.speak(msg);
    if (board[col][row].daily_double_wager > 0) {
      scores[playerName].score -= player.wager;
    } else {
      scores[playerName].score -= board[col][row].value;
      stats.coryatScore -= board[col][row].value;
    }
    setScores(scores);
    updateOpponentScores(row, col);
    resetClue(row, col);
    setDisableClue(false);
  }

  function isPlayerDailyDouble(row, col) {
    return contestants.lastCorrect === playerName && board[col][row].daily_double_wager > 0;
  }

  function resetClue(row, col) {
    setBoardState(row, col, 'closed');
    setResponseTimerIsActive(false);
    response.countdown = false;
  }

  function concede(row, col) {
    setBoardState(row, col, 'closed');
    setResponseTimerIsActive(false);
    player.conceded = true;
    updateOpponentScores(row, col);
    if (contestants.lastCorrect === playerName) {
      setDisableClue(false);
    }
  }

  function showAnswer(row, col) {
    setResponseTimerIsActive(false);
    response.countdown = false;
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
    // keep the buzzer disabled for 500ms
    setTimeout(() => {
      setDisableAnswer(false);
      setResponseTimerIsActive(true);
    }, 500);
  }

  function submit(row, col) {
    if (round === 3) {
      document.getElementById('final-input').value = null;
      setDisableAnswer(true);
      response.countdown = false;
      setScores(scores);
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
    scores[playerName].response = player.finalResponse;
    scores[playerName].wager = player.wager;
    Object.keys(scores).forEach(contestant => {
      showData.final_jeopardy.contestant_responses.forEach(response => {
        if (response.contestant === contestant) {
          scores[contestant].response = response.response;
          scores[contestant].wager = 0;
          if (scores[contestant].score >= response.wager) {
            scores[contestant].wager = response.wager;
          } else {
            scores[contestant].wager = scores[contestant].score;
          }
        }
      });
    });
    setScores(scores);
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

  function isFinalJeopardyCategoryCell(row, col) {
    return row === 1 && col === 3;
  }

  function isFinalJeopardyResponseCell(row, col) {
    return row === 2 && col === 3;
  }

  if (!board) {
    return <h1 className='center-screen'>Welcome to JEOPARDY!</h1>;
  }
  return (
    round === -1 ? <Name loadBoard={loadBoard}></Name> :
    <FullScreen handle={handle}>
      <ScoreContext.Provider
          value={scores}
        >
      <main>
        <meta name='viewport' content='width=device-width, initial-scale=1' />
          <Podium startTimer={response.countdown} playerName={playerName} />
        <div id='monitor-container' onClick={startRound}>
          <Monitor message={message} imageUrl={imageUrl} />
        </div>
        <table id='board'>
          <thead>
            <tr id='headers'>
              {Array.from(Array(6), (_arrayElement, row) =>
                <th key={'header' + row}>{round !== 3 && getCategory(board[row])}
                  {board[row][0].category_note && <span className='tooltip'>{board[row][0].category_note}</span>}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from(Array(5), (_arrayElement, row) =>
              <tr key={'row' + row}>
                {board.map((category, column) =>
                  <td key={'column' + column}>
                    {!category[row].visible && <button className='clue' onClick={() => displayClue(row, column)} disabled={disableClue}>${category[row].value}</button>}
                    <span>{category[row] && category[row].visible === 'clue' && category[row].text}</span>
                    {category[row].visible === 'buzzer' && category[row].daily_double_wager === 0 &&
                      <div className='clue'>
                        <button className='answer-button buzzer-button' onClick={() => answer(row, column)} disabled={disableAnswer}><HiHandRaised /></button>
                        <button className='answer-button flag-button' onClick={() => concede(row, column)}><BsFillFlagFill /></button>
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
                          <input defaultValue={player.wager} onChange={handleInputChange} />
                        </div>
                      </div>
                    }
                    {round === 3 && isFinalJeopardyCategoryCell(row, column) && category[row].visible !== 'final' &&
                      <h3>
                        {showData.final_jeopardy.category}
                      </h3>
                    }
                    {isFinalJeopardyCategoryCell(row, column) && category[row].visible === 'final' &&
                      <div>
                        {showData.final_jeopardy.clue.toUpperCase()}
                      </div>
                    }
                    {round === 3 && isFinalJeopardyResponseCell(row, column) &&
                      <div>
                        {board[3][1].visible !== 'final' && <span>ENTER YOUR WAGER:</span>}
                        {board[3][1].visible === 'final' && <span>ENTER YOUR RESPONSE:</span>}
                        <div className='wager'>
                          {board[3][1].visible !== 'final' && <button id='final-submit-button' className='submit-button' disabled={disableAnswer} onClick={submit}>SUBMIT</button>}
                          <input id='final-input' defaultValue={player.wager} onChange={handleInputChange} />
                        </div>
                      </div>
                    }
                  </td>
                )}
              </tr>
            )}
          </tbody>
        </table>
      </main>
      </ScoreContext.Provider>
    </FullScreen>
  );
}

export default App;
