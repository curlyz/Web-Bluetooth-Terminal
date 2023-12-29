setInterval(


    () => {
        pako = window.pako
        decode = window.msgpack.decode

        var win = window
        window.burnFirmware = async () => {
            // let consent = await Swal.fire({
            //     title: 'Upgrade Firmware',
            //     text: 'This board will be updated to latest firmware',
            //     icon: 'info',
            //     showConfirmButton: true,
            // })
            // if (consent.isConfirmed == false) return;
            const ui8ToBstr = (u8Array) => {
                let b_str = "";
                for (let i = 0; i < u8Array.length; i++) {
                    b_str += String.fromCharCode(u8Array[i]);
                }
                return b_str;
            }

            var device = await navigator.serial.requestPort()

            // Swal.fire({
            //     title: 'Upgrading ...',
            //     text: 'This will take 60 seconds',
            //     icon: 'info',
            //     timer: 60000
            // })
            var transport = new Transport(device)
            try {
                var esploader = new ESPLoader({ transport, baudrate: 115200, romBaudrate: 115200 })
                var chip = await esploader.main_fn()
                var mac = await esploader.chip.read_mac(esploader)
                await esploader.flash_spi_attach(0)
                await transport.disconnect()
                window.logToTerminal(`- requesting firmware for device`)
                var req = await fetch('https://api.anatalab.com/gateway', {
                    body: JSON.stringify({
                        cmd: 'build_firmware',
                        event: 'start',
                        uuid: String(new Date().getTime()),
                        data: {
                            mac,
                        }
                    }),
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                window.logToTerminal(`- received`)


                // var request = new TrackableRequest('build_firmware', {mac:mac})
                // // request.on('update', (msg: string) => {
                // //     window.logToTerminal('update/', msg)
                // // })
                // await request.sync();

                win.req = req
                var buffer = await req.arrayBuffer()
                var pkg = decode(pako.inflate(buffer))
                var fileArray = []
                pkg.forEach(part => {
                    fileArray.unshift({
                        data: ui8ToBstr(part.data),
                        address: part.address
                    })
                    window.logToTerminal(`- will burn file ${part.name} at ${part.address}`)
                })
                var flashOptions = {
                    fileArray,
                    flashSize: 'keep',
                    eraseAll: true,
                    reportProgress: (fileIndex, written, total) => {
                        // window.logToTerminal({ fileIndex, written, total })
                    },
                    flashFreq: 'keep',
                    flashMode: 'keep',
                    compress: true,
                    // calculateMD5Hash: (image) => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)),
                }

                // await window.usbJTAGSerialReset(transport)
                var transport = new Transport(device)
                var esploader = new ESPLoader({ transport, baudrate: 115200, romBaudrate: 115200 })
                var chip = await esploader.main_fn()

                await esploader.flash_spi_attach(0)

                window.logToTerminal("- serial port claimed successfully")
                // var RTCCNTL_BASE_REG = 0x60008000
                // var RTC_CNTL_SWD_CONF_REG = RTCCNTL_BASE_REG + 0x00B4
                // var RTC_CNTL_SWD_AUTO_FEED_EN = 1 << 31
                // var RTC_CNTL_SWD_WPROTECT_REG = RTCCNTL_BASE_REG + 0x00B8
                // var RTC_CNTL_SWD_WKEY = 0x8F1D312A
                // var RTC_CNTL_WDTCONFIG0_REG = RTCCNTL_BASE_REG + 0x0098
                // var RTC_CNTL_WDTWPROTECT_REG = RTCCNTL_BASE_REG + 0x00B0
                // var RTC_CNTL_WDT_WKEY = 0x50D83AA1
                // await esploader.write_reg(RTC_CNTL_WDTWPROTECT_REG, RTC_CNTL_WDT_WKEY)
                // await esploader.write_reg(RTC_CNTL_WDTCONFIG0_REG, 0)
                // await esploader.write_reg(RTC_CNTL_WDTWPROTECT_REG, 0)

                // await esploader.write_reg(RTC_CNTL_SWD_WPROTECT_REG, RTC_CNTL_SWD_WKEY)
                // await esploader.write_reg(
                //     RTC_CNTL_SWD_CONF_REG,
                //     await esploader.read_reg(RTC_CNTL_SWD_CONF_REG)
                //     | RTC_CNTL_SWD_AUTO_FEED_EN,
                // )
                // await esploader.write_reg(RTC_CNTL_SWD_WPROTECT_REG, 0)


                // window.logToTerminal("FlashOptions", flashOptions)
                await esploader.write_flash(flashOptions)
                await esploader.hard_reset()

                // Swal.fire({
                //     title: 'Upgrade Completed',
                //     icon: 'success',

                // })
                window.logToTerminal("------------Upgrade Completed-------------");
            }
            catch (e) {
                Swal.fire({
                    title: 'Something Happened',
                    text: `Error: ${String(e)}`,
                    icon: 'error'
                })
            }
            finally {
                try {

                    await transport.disconnect();
                }
                catch (e) {

                }
            }
        }

    },
    1000,
)


console.log = function (...args) {
    const message = args.join(' ');
    // Your custom logic here
    // For example, you can send the message to a server or display it in a different format
    // console.log(message);
    window.logToTerminal(message)
};

// console.info = console.log