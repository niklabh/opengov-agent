<div className="space-y-4">
    <h2 className="text-2xl font-bold">{proposal.title}</h2>
    <div 
      className="text-muted-foreground proposal-content" 
      dangerouslySetInnerHTML={{ __html: proposal.description }}
    />
    <div className="flex space-x-2 mb-4">
        <Badge variant={proposal.status === "voted" ? "success" : "secondary"}>
          {proposal.status === "voted" ? "Voted" : "Pending"}
        </Badge>
        <Badge variant="outline">Score: {proposal.score}/100</Badge>
        {proposal.voteResult && (
          <Badge variant="outline" className="bg-green-100">
            Vote: {proposal.voteResult.toUpperCase()}
          </Badge>
        )}
      </div>

      {proposal.voteTxHash && (
        <div className="mb-4 text-sm">
          <a 
            href={`https://polkadot.subscan.io/extrinsic/${proposal.voteTxHash}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View transaction on Subscan
          </a>
        </div>
      )}
</div>