import { useState, useEffect } from 'react'
import { Auth, Hub } from 'aws-amplify'
import '../styles/globals.css'
import '../configureAmplify'
import Link from 'next/link'

function MyApp({ Component, pageProps }) {
  const [signedInUser, setSignedInUser] = useState(false)

  useEffect(() => {
  authListener()
  })
  async function authListener() {
    Hub.listen('auth', (data) => {
      switch (data.payload.event) {
        case 'signIn':
          return setSignedInUser(true)
        case 'signOut':
          return setSignedInUser(false)
      }
    })
    try {
      await Auth.currentAuthenticatedUser()
      setSignedInUser(true)
    } catch (err) {}
  }
  
  return (
  <div>
    <nav className="p-6 border-b border-gray-300">
      <Link href="/">
        <span className="mr-6 cursor-pointer">Home</span>
      </Link>
      <Link href="/create-post">
        <span className="mr-6 cursor-pointer">Create Post</span>
        </Link>
        {
          signedInUser && (
            <Link href="/my-posts">
              <span className="mr-6 cursor-pointer">My Posts</span>
            </Link>
          )
        }
      <Link href="/profile">
        <span className="mr-6 cursor-pointer">Profile</span>
      </Link>
    </nav>
    <div className="py-8 px-16">
      <Component {...pageProps} />
      </div>
      <footer className="p-6 border-t border-gray-300">
        <p>Made with <a href="https://docs.amplify.aws/" target="_blank" rel="noopener noreferrer" style={{color: "#ff9900"}}><b>Amplify</b></a>, <a href="https://nextjs.org/" target="_blank" rel="noopener noreferrer"><b>Next.JS</b></a> based on the workshop from <a href="https://twitter.com/dabit3" target="_blank" rel="noopener noreferrer" style={{color: "#2563eb"}}><b>Nader Dabit</b></a> by <a href="https://ibrahimcesar.cloud" target="_blank" rel="noopener noreferrer" style={{color: "#e66533"}}><b>Ibrahim Cesar</b></a> from 🇧🇷</p>
      </footer>
  </div>
  )
}

export default MyApp