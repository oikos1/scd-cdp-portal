import React from "react";

class LoadingSpinner extends React.Component {
  render() {
    return (
      <div className="spinner" { ...this.props }>
        <div className="maker-logo">
          <svg width="36" height="26" viewBox="0 0 36 26" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" fillRule="evenodd"><path d="m-545-61h1124v400h-1124z"/><g fill="#fff" fillRule="nonzero" transform=""><path d="m1.91526605 2.66947951v21.78180259c0 .4604624-.37327857.833741-.83374102.833741-.46046246 0-.83374103-.3732786-.83374103-.833741v-23.4512821c0-.68740815.78509259-1.07948478 1.33462399-.66651358l14.55897431 10.94102568c.2095655.1574878.3328581.4043683.3328581.6665135v12.5102565c0 .4604624-.3732786.833741-.833741.833741-.4604625 0-.833741-.3732786-.833741-.833741v-12.0938847z"/><path d="m20.963984 12.3573974v12.0938847c0 .4604624-.3732786.833741-.833741.833741-.4604625 0-.8337411-.3732786-.8337411-.833741v-12.5102565c0-.2621452.1232926-.5090257.3328581-.6665135l14.5589744-10.94102568c.5495314-.4129712 1.334624-.02089457 1.334624.66651358v23.4512821c0 .4604624-.3732786.833741-.8337411.833741-.4604624 0-.833741-.3732786-.833741-.833741v-21.78180259z"/></g></g>
          </svg>
        </div>
      </div>
    )
  }
}

export default LoadingSpinner;
