import React, { Component, createRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// agora sdk
import RtcEngine from 'react-native-agora';

// lottieView for animation
import LottieView from 'lottie-react-native';

//permissions
import requestCameraAndAudioPermission from './components/Permission';

//styles
import styles from './components/Style';

interface Props {}

/**
 * @property peerIds Array for storing connected peers
 * @property appId
 * @property channelName Channel Name for the current session
 * @property joinSucceed State variable for storing success
 */
interface State {
  appId: string;
  token: string;
  channelName: string;
  joinSucceed: boolean;
  peerIds: number[];
  animationOn: boolean;
  pitch: number[];
}


export default class App extends Component<Props, State> {
  _engine?: RtcEngine;
  private animation = createRef<LottieView>()
  constructor(props) {
    super(props);
    this.state = {
      appId: '92b2bc2a079e4d5a917edbd3401984cf',
      token: '00692b2bc2a079e4d5a917edbd3401984cfIACeibuswFG+nHO/cgzgxU5ewADlS+uJ/gGrLsXN8rHQycRmA6UAAAAAIgA5BlQCwLI8YgQAAQBwiztiAwBwiztiAgBwiztiBABwizti',
      channelName: 'cn',
      joinSucceed: false,
      peerIds: [],
      animationOn: false,
      pitch: []
    };
    if (Platform.OS === 'android') {
      // Request required permissions from Android
      requestCameraAndAudioPermission().then(() => {
        console.log('requested!');
      });
    }
  }
  componentDidMount() {
    this.init();
  }

  /**
   * @name init
   * @description Function to initialize the Rtc Engine, attach event listeners and actions
   */
  init = async () => {
    const { appId } = this.state;
    this._engine = await RtcEngine.create(appId);

    // Enables the audioVolumeIndicaton with interval, smooth and report_vad
    if (Platform.OS === 'android') {
      await this._engine.enableAudioVolumeIndication(1200,10,true)
    } else {
      await this._engine.enableAudioVolumeIndication(200,10,true)
    }

    this._engine.addListener('Warning', (warn) => {
      // console.log('Warning', warn);
    });

    // Re-usable fixed-array func, returns fixed-array with decided length
    // Fixed-array overwrites the push method and when length hits the max-length fixed-array pops up the first element
    function getArrayWithLimitedLength(length) {
      var array = new Array();
  
      array.push = function () {
          if (this.length >= length) {
              this.shift();
          }
          return Array.prototype.push.apply(this,arguments);
      }
      return array;
    }

    // Makes fixed-array
    let tvArray = getArrayWithLimitedLength(10)

    // Subscribes to AudioVolumeIndication and listens total volume
    this._engine.addListener('AudioVolumeIndication', (avi, tv)=> {

          // Fills our fixed-array with total-volume data
          tvArray.push(tv)
          // console.log(tvArray)

          // Sets data-filled fixed-array to a state
          this.setState({
            pitch: tvArray
          })

          // Checks the data and decides our animation to pausable or not
          const isPausable = () => {
            let res = 0;
            for (let i = 0; i < tvArray.length; i++) {
              if (tvArray[i] < 50){
                res += 1;
              }
            }
            if(res>4){
              return true;
            } else {
              return false;
            }
          }
          // const isResumable = () => {
          //   let res = 0;
          //   for (let i = 0; i < tvArray.length; i++) {
          //     if (tvArray[i] > 20){
          //       res += 1;
          //     } 
          //   }
          //   if(res>3){
          //     return true;
          //   } else {
          //     return false;
          //   }
          // }

            // This logic is doing the job on the animation
            if (this.state.animationOn) {
              if (Platform.OS === 'android' ? isPausable() : tv<30) {
                  this.setState({animationOn: false})
                  this.animation.current?.pause();
                }
            } else {
              if (tv > 30) {
                  this.setState({animationOn: true})
                  this.animation.current?.play();
              }
            }
    });

    this._engine.addListener('Error', (err) => {
      // console.log('Error', err);
    });

    this._engine.addListener('UserJoined', (uid, elapsed) => {
      console.log('UserJoined', uid, elapsed);
      // Get current peer IDs
      const { peerIds } = this.state;
      // If new user
      if (peerIds.indexOf(uid) === -1) {
        this.setState({
          // Add peer ID to state array
          peerIds: [...peerIds, uid],
        });
      }
    });

    this._engine.addListener('UserOffline', (uid, reason) => {
      console.log('UserOffline', uid, reason);
      const { peerIds } = this.state;
      this.setState({
        // Remove peer ID from state array
        peerIds: peerIds.filter((id) => id !== uid),
      });
    });

    // If Local user joins RTC channel
    this._engine.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
      console.log('JoinChannelSuccess', channel, uid, elapsed);
      // Set state variable to true
      this.setState({
        joinSucceed: true,
      });
    });
  };

  /**
   * @name startCall
   * @description Function to start the call
   */
  startCall = async () => {
    // Join Channel using null token and channel name
    await this._engine?.joinChannel(
      this.state.token,
      this.state.channelName,
      null,
      0
    );
  };

  /**
   * @name endCall
   * @description Function to end the call
   */
  endCall = async () => {
    await this._engine?.leaveChannel();
    this.setState({ peerIds: [], joinSucceed: false });
  };

  render() {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{flex:1}}
      >
        <View style={styles.max}>
          <View style={styles.max}>
            <View style={styles.buttonHolder}>
              <TouchableOpacity onPress={this.startCall} style={styles.button}>
                <Text style={styles.buttonText}> Start Call </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={this.endCall} style={styles.button}>
                <Text style={styles.buttonText}> End Call </Text>
              </TouchableOpacity>
            </View>
            {this.state.joinSucceed?
            <View style={styles.animationHolder}>
              {this._renderAnimation()}
            </View>
            :
            <View style={styles.animationHolder}>
              <TextInput
                style={styles.input}
                placeholder='App ID'
                onChangeText={value => {this.setState({
                  appId : value
                });
                console.log(this.state.appId)}}
              />
              <TextInput
                style={styles.input}
                placeholder='Token'
                onChangeText={value => this.setState({
                  token : value
                })}
                />
              <TextInput
                style={styles.input}
                placeholder='Channel Name'
                onChangeText={value => this.setState({
                  channelName : value
                })}
                />
            </View>
            }
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  _renderAnimation = () => {
    const { joinSucceed } = this.state;
    const animationsrc = require('./assets/animation1.json');

    return joinSucceed ? (
      <View style={styles.fullView}>
          <LottieView
            ref={this.animation}
            source={animationsrc}
            style={styles.animation}
          />
          <Text style={{textAlign:'center'}}>{this.state.pitch}</Text>
      </View>
    ) : null;
  };
}
