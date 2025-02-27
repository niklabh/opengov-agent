<div className="space-y-4">
    <h2 className="text-2xl font-bold">{proposal.title}</h2>
    <div 
      className="text-muted-foreground proposal-content" 
      dangerouslySetInnerHTML={{ __html: proposal.description }}
    />
</div>