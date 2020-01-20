// Libraries
import React, {Component} from "react";
import {inject, observer} from "mobx-react";
import mixpanel from 'mixpanel-browser';

// Components
import InlineNotification from "./InlineNotification";

//Utils
import {printNumber, formatAmount} from "../utils/helpers";
import CupInfoMobile from "./CupInfoMobile";

@inject("system")
@observer
class NewCupMobile extends Component {
  usdValue = eth => {
    const ethPrice = this.props.system.pip.val / 1000000000000000000;
    return eth * ethPrice;
  }

  render() {
    const {
      checkValues,
      daiText,
      error,
      dai,
      eth,
      ethText,
      liqPrice,
      maxDaiAvail,
      ratio,
      submitEnabled,
      warning
    } = this.props.newCupProps;

    return (
      <div id="newCupMobile">
        <div className="row">
          <div className="col" style={ {border: "none"} }>
            <label className="typo-cm no-select typo-bolder" style={{color: "#ffffff", marginTop: "8px"}}>How much TRX would you like to collateralize?</label>
            <div className="input-values-container">
              <input ref={ input => this.eth = input } type="number" id="inputETH" className="number-input" required step="0.000000000000000001" placeholder="0.000" value={ ethText } onChange={ e => { checkValues("eth", e.target.value) } } onKeyDown={ e => { if (e.keyCode === 38 || e.keyCode === 40 || e.keyCode === 189) e.preventDefault() } } style={{marginBottom: "5px"}} />
              <span className="unit">TRX</span>
              <div className="typo-cm align-left clearfix">
                Worth ${ printNumber(this.usdValue(eth)) }
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col">
            <label className="typo-cm no-select typo-bolder" style={{color: "#ffffff"}}>How much SAI would you like to generate?</label>
            <div className="input-values-container" style={{marginBottom: "10px"}}>
              <input ref={ input => this.dai = input } type="number" id="inputDAI" className="number-input" required step="0.000000000000000001" placeholder="0.000" value={ daiText } style={{marginBottom: "5px"}} onChange={ e => { checkValues("dai", e.target.value) } } onKeyDown={ e => { if (e.keyCode === 38 || e.keyCode === 40 || e.keyCode === 189) e.preventDefault() } } />
              <span className="unit">DAI</span>
              {
                maxDaiAvail &&
                <p className="typo-cm align-left clearfix">Max SAI available to generate: { printNumber(maxDaiAvail) } SAI</p>
              }
            </div>
          </div>
        </div>

        <CupInfoMobile liqPrice={liqPrice} ratio={ratio}/>

        <div className="row" style={ {borderBottom: "none"} }>
          { warning && <div style={{marginTop: "-40px", marginBottom: "10px"}}><InlineNotification type="warning" message={ warning } /></div> }
          { error && <div style={{marginTop: "-40px", marginBottom: "10px"}}><InlineNotification type="error" message={ error } /></div> }
        </div>

        <div className="row" style={ {borderBottom: "none", marginBottom: "40px"}}>
          <div className="col">
            <button className={"bright-style text-btn text-btn-primary-mobile"} onClick={() => mixpanel.track('btn-click', { id: 'collateralize-generate', mobile: true, product: 'scd-cdp-portal', collateral: formatAmount(eth), debt: formatAmount(dai) })} type="submit" disabled={ !submitEnabled }>continue</button>
          </div>
        </div>
      </div>
    );
  }
}

export default NewCupMobile;
