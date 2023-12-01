import './App.css';
import './index.scss';
import React, { useState, useEffect } from 'react';
import Podium from './components/Podium';

import Monitor from './components/Monitor';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';
import Name from './components/Name';
import sampleGame from './resources/sample_game.json';
import Board from './components/Board';

export const ScoreContext = React.createContext();
export const StartTimerContext = React.createContext();
export const PlayerContext = React.createContext();

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
    fetch('http://localhost:5000/game/3767')
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
    if (round <= 1) {
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

  function isPlayerDailyDouble(row, col) {
    return contestants.lastCorrect === playerName && board[col][row].daily_double_wager > 0;
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

  function readText(text) {
    msg.text = text;
    window.speechSynthesis.speak(msg);
    // keep the buzzer disabled for 500ms
    setTimeout(() => {
      setDisableAnswer(false);
      setResponseTimerIsActive(true);
    }, 500);
  }

  function showFinalJeopardyCategory() {
    round = 3;
    setDisableAnswer(false);
    setMessageLines('');
    msg.text = 'The final jeopardy category is ' + showData.final_jeopardy.category + '. How much will you wager';
    window.speechSynthesis.speak(msg);
  }

  if (!board) {
    return <h1 className='center-screen'>Welcome to JEOPARDY!</h1>;
  }
  return (
    round === -1 ? <Name loadBoard={loadBoard} /> :
    <FullScreen handle={handle}>
      <ScoreContext.Provider value={scores}>
        <StartTimerContext.Provider value={response.countdown}>
          <PlayerContext.Provider value={playerName}>
      <main>
        <meta name='viewport' content='width=device-width, initial-scale=1' />
          <Podium />
        <div id='monitor-container' onClick={startRound}>
          <Monitor message={message} imageUrl={imageUrl} />
        </div>
        <Board board={board} round={round} displayClueByNumber={displayClueByNumber}
          disableAnswer={disableAnswer} disableClue={disableClue}
          setMessageLines={setMessageLines} updateOpponentScores={updateOpponentScores}
          enterFullScreen={enterFullScreen} updateAvailableClueNumbers={updateAvailableClueNumbers}
          readClue={readClue} setBoardState={setBoardState} concede={concede} readText={readText}
          player={player} showData={showData} setImageUrl={setImageUrl} setScores={setScores}
          playerName={playerName} stats={stats} msg={msg} response={response}
          setDisableAnswer={setDisableAnswer} setResponseTimerIsActive={setResponseTimerIsActive}
          setDisableClue={setDisableClue} contestants={contestants}/>
      </main>
      </PlayerContext.Provider>
      </StartTimerContext.Provider>
      </ScoreContext.Provider>
    </FullScreen>
  );
}

export default App;
